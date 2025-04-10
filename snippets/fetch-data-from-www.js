import axios from "axios";
import * as cheerio from "cheerio";

// Constants
const BLOG_PAGE_URL = "https://www.amsterdamstandard.com/blog/";
const AI_PAGES = BLOG_PAGE_URL + "tag/ai";

/**
 * Fetch the content of the given URL.
 * @param {string} url - The URL to fetch content from
 * @returns {Promise<string>} The page content
 */
async function getPageContent(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}: ${error.message}`);
    throw error;
  }
}

/**
 * Filter and return blog URLs from a list of URLs.
 * @param {string[]} urls - List of URLs to filter
 * @returns {string[]} Filtered blog URLs
 */
function getBlogUrls(urls) {
  return urls.filter((url) => url.includes(BLOG_PAGE_URL));
}

/**
 * Parse HTML content and return AI-related blog URLs.
 * @param {string} htmlContent - HTML content to parse
 * @returns {string[]} List of AI-related blog URLs
 */
function findAiUrls(htmlContent) {
  const $ = cheerio.load(htmlContent);
  const urls = [];

  // Extract all URLs from anchor tags
  $("a").each((i, element) => {
    const href = $(element).attr("href");
    if (href) {
      urls.push(href);
    }
  });

  return getBlogUrls(urls);
}

/**
 * Main function to execute the process
 */
async function main() {
  try {
    console.log("Fetching AI blog pages...");
    const aiPageContent = await getPageContent(AI_PAGES);
    const aiUrls = findAiUrls(aiPageContent);
    console.log("AI-related blog URLs:");
    console.log(aiUrls);
  } catch (error) {
    console.error("Error in main process:", error);
  }
}

// Execute the main function
main();
