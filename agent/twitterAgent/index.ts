import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import 'dotenv/config';


// Initialize Twitter API client with environment variables
const twitterLogin = {
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET
};

console.log("twitterLogin", twitterLogin)

if (!twitterLogin.appKey || !twitterLogin.appSecret || !twitterLogin.accessToken || !twitterLogin.accessSecret) {
  throw new Error('Twitter API credentials not properly configured in environment variables');
}

let failedCheck = false;

let queue:any = []

const generateImage = async function (promptData, tweetId, authorId) {

  try {
    const auth = "Basic " + Buffer.from(process.env.PP_API_KEY).toString("base64");
    const url = new URL(`https://api.projectplutus.ai/api/imageGen/prompt`);
    const fetchPromise = fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth
      },
      body: JSON.stringify({ prompt: promptData })
    });

    const response = await Promise.race([fetchPromise]);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log("data", data)
    queue.push({ tries: 0, prompt: promptData, tweetId: tweetId, failedTries: 0, authorId: authorId })
    failedCheck = false;
    return data;
  } catch (e) {
    console.log("e", e)
    failedCheck = true;
  }

  return null;

};


const fetchReply = async function (imageUrl, tweetId, authorId) {

  const promptData = {
    imageUrl: imageUrl,
    seed: Math.floor(Math.random() * 10000000),
    prompt: process.env.TWITTER_PROMPT
  }

  generateImage(promptData, tweetId, authorId);

}


setInterval(processQueue, 5000);

async function processQueue() {
  if (queue.length === 0) return;

  const item = queue[0];
  const imageUrl = `https://projectplutus.s3.us-east-2.amazonaws.com/${item.prompt.seed}.mp4`;

  try {
    // Validate URL format before processing
    if (!imageUrl.startsWith('https://')) {
      throw new Error('Invalid URL format');
    }

    // Check if the image URL is accessible
    const response = await axios.head(imageUrl);
    if (response.status !== 200) {
      throw new Error('Image not found at URL');
    }

    // Increment failed tries
    item.failedTries += 1;
    console.log(`Processing tweet ${item.tweetId}, attempt ${item.failedTries}`);

    if (item.failedTries <= 3) {

      // Create the tweet with the image URL
      const tweetContent = imageUrl;

      await replyToTweet(item.tweetId, tweetContent, item.authorId);

      // Remove successfully processed item
      queue.shift();
    } else {
      console.log(`Max retries reached for tweet ${item.tweetId}, removing from queue`);
      queue.shift();
    }
  } catch (error) {
    // only console log if not a 403 error
    if (!error.message.includes('403')) {
      console.error(`Error processing tweet ${item.tweetId}:`, error);
    }
  }
}


let sinceId;

async function saveSinceId() {
  try {
    console.log("sinceId", sinceId)
    await fs.writeFile('sinceId.txt', sinceId, 'utf8');
  } catch (error) {
    console.error('Error saving sinceId:', error);
    throw error;
  }
}

async function loadSinceId() {
  try {
    const exists = await fs.stat('sinceId.txt').then(() => true).catch(() => false);
    console.log("exists", exists)
    if (exists) {
      sinceId = await fs.readFile('sinceId.txt', 'utf8');
    } else {
      sinceId = "0"; // Start with the original tweet ID
    }
  } catch (error) {
    console.error('Error loading sinceId:', error);
    sinceId = "0";
  }
}

await loadSinceId();

const processedTweetIds = new Set();


// Function to reply to a tweet with an image
async function replyToTweet(tweetIdToReply, imageUrl, authorId) {
  try {

    const client = new TwitterApi(twitterLogin);
    // Download the image from the URL
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const mediaBuffer = Buffer.from(response.data);

    // Upload the media to Twitter
    const mediaId = await client.v1.uploadMedia(mediaBuffer, {
      type: imageUrl.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg'
    });

    console.log("Media uploaded successfully:", mediaId);

    // Ensure we have a valid media ID
    if (!mediaId) {
      throw new Error('Failed to get media ID from upload response');
    }

    //get author
    const author = await client.v2.user(authorId);
    if (author.data.username == "SquishAI_") {
      return;
    }
    // Reply to the tweet with the uploaded media
    const reply = await client.v2.tweet({
      text: process.env.TWITTER_REPLY + " @" + author.data.username,
      reply: { in_reply_to_tweet_id: tweetIdToReply },
      media: {
        media_ids: [mediaId]
      }
    });

    console.log(`Replied to tweet ID ${tweetIdToReply} with media:`, reply.data);
  } catch (error) {
    console.error(`Error replying to tweet ID ${tweetIdToReply}:`, error);
  }
}

const username = process.env.TWITTER_USERNAME;
let processReplies = false

let bigErrorCount = 0

async function fetchAndProcessTweets() {
  try {
    const newTweets = [];

    if (!processReplies && queue.length == 0) {
      processReplies = true;

      // Construct a query that finds only direct mentions of the username with @ symbol
      const query = `@${username}`;

      // Optimize API calls by getting all needed data in one request
      const params = {
        expansions: [
          'author_id',
          'attachments.media_keys',
          'referenced_tweets.id',
          'referenced_tweets.id.attachments.media_keys'
        ],
        'tweet.fields': [
          'author_id',
          'created_at',
          'text',
          'attachments',
          'referenced_tweets',
          'in_reply_to_user_id'
        ],
        'user.fields': ['username', 'name'],
        'media.fields': ['url', 'type'],
        max_results: 10,
      };

      // Update params to include since_id
      let updatedParams = params;

      if (sinceId != "0") {
        updatedParams = { ...params, since_id: sinceId };
      }

      const client = new TwitterApi(twitterLogin);


      // Add retry logic with exponential backoff
      let attempts = 0;
      const maxAttempts = 2;
      let paginator;

      while (attempts < maxAttempts) {
        try {
          paginator = await client.v2.search(query, updatedParams);
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            console.error('Failed to fetch tweets after multiple attempts:', error);
            throw error;
          }
          const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
          console.log(`API error, retrying in ${delay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }


      if (!paginator) return;


      // Cache all media URLs for efficient lookup
      const mediaMap = new Map();
      if (paginator.includes?.media) {
        for (const media of paginator.includes.media) {
          mediaMap.set(media.media_key, media.url);
        }
      }


      for await (const tweet of paginator) {

        let tweetId = tweet.id;
        // Skip if this is a retweet or quote tweet
        if (tweet.referenced_tweets?.some(ref => ref.type === 'retweeted' || ref.type === 'quoted')) {
          console.log(`Skipping ${tweet.referenced_tweets.some(ref => ref.type === 'retweeted') ? 'retweet' : 'quote tweet'}:`, tweet.id);
          continue;
        }

        let isDirectReply = false;
        let isQuoteRetweet = false;
        let imageUrl = null;

        // Check if tweet is reply or quote
        if (tweet.referenced_tweets) {
          for (const ref of tweet.referenced_tweets) {
            if (ref.type === 'replied_to') {
              isDirectReply = true;
            } else if (ref.type === 'quoted') {
              isQuoteRetweet = true;
            }
          }
        }

        // Check for images in current tweet and get the first one
        if (tweet.attachments?.media_keys) {
          const firstMediaKey = tweet.attachments.media_keys[0];
          const url = mediaMap.get(firstMediaKey);
          if (url) {
            imageUrl = url;
          }
        }

        // If no image found in main tweet, check referenced tweets for the first image
        if (!imageUrl && tweet.referenced_tweets) {
          for (const ref of tweet.referenced_tweets) {
            const referencedTweet = paginator.includes?.tweets?.find(t => t.id === ref.id);
            if (referencedTweet && referencedTweet.attachments?.media_keys) {
              const firstMediaKey = referencedTweet.attachments.media_keys[0];
              const url = mediaMap.get(firstMediaKey);
              if (url) {
                imageUrl = url;
                tweetId = ref.id;
                break;
              }
            }
          }
        }

        // Check if tweet mentions the username
        const mentionsUsername = tweet.text.toLowerCase().includes(`@${username.toLowerCase()}`);

        // Process tweet if it mentions the username and has an image
        if (mentionsUsername && imageUrl) {
          newTweets.push({ tweet, isDirectReply, isQuoteRetweet, imageUrl, tweetId });
          processedTweetIds.add(tweet.id);
        }
      }

      //sort newTweets by tweet.id ascending
      newTweets.sort((a, b) => a.tweet.id - b.tweet.id);

      // Process new tweets
      for (const { tweet, isDirectReply, isQuoteRetweet, imageUrl, tweetId } of newTweets) {

        const isActiveUser = queue.find(item => item.authorId === tweet.author_id);
        if (isActiveUser) {
          console.log("User is already in queue, should skip but wont tweet:", tweet.id);
          // continue;
        }
        console.log("Processing tweet with image:", tweet.id);
        await fetchReply(imageUrl, tweetId, tweet.author_id);

        // Delay to avoid rate limits   
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second   
      }

      if (newTweets.length > 0) {
        sinceId = newTweets[newTweets.length - 1].tweet.id;
        await saveSinceId();
      }

      processReplies = false;
    }
  } catch (error) {
    processReplies = false;
    bigErrorCount = bigErrorCount + 1;
    console.error('Error fetching or processing tweets:', error);
    if (bigErrorCount > 5) {
      console.log("bigErrorCount", bigErrorCount)
      process.exit(1);
    }
  }
}


// Initial fetch and process
fetchAndProcessTweets();

// Set up periodic polling
const POLLING_INTERVAL = 60000; // 60 seconds
setInterval(fetchAndProcessTweets, POLLING_INTERVAL);
