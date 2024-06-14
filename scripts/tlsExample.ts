import https from 'node:https';
import * as console from 'node:console';
import axios from 'axios';

const httpsAgent = new https.Agent({ ca, cert, key });

async function httpsGet(url: string) {
  try {
    const response = await axios({ url, httpsAgent });
    console.log('GET response data:', response.data);
  } catch (error) {
    console.error('Error during GET request:', error);
  }
}

async function httpsPost(url: string, data: unknown) {
  try {
    const response = await axios({ url, data, httpsAgent });
    console.log('POST response data:', response.data);
  } catch (error) {
    console.error('Error during POST request:', error);
  }
}

const baseUrl = 'https://localhost:6443';
const getUrl = `${baseUrl}/api/get`;
const postUrl = `${baseUrl}/api/post?query=1`;
const postData = { key1: 'value1', key2: 'value2' };

httpsGet(getUrl);
httpsPost(postUrl, postData);
