import fetch from "cross-fetch";
import fs from "fs";
import ytdl from 'ytdl-core';

const getVideoIds = async (channel: string) => {
  const url = `https://www.youtube.com/${channel}/videos`;
    const response = await fetch(url);
  const body = await response.text();

  const result = body.match(/ytInitialData = {.*};<\/script>/)[0];
  return [...result.matchAll(/"videoId":"(.{1,20})"/g)].map(result => result[1]);

}


const getVideoDetails = async (videoId: string) => {
  const url = `http://www.youtube.com/watch?v=${videoId}`;
    const { videoDetails } = await ytdl.getBasicInfo(url)
  return {
    lengthSeconds: videoDetails.lengthSeconds,
    title: videoDetails.title,
    descrption: videoDetails.description,
    thumbnail: videoDetails.thumbnails[0]?.url,
    uploadDate: videoDetails.uploadDate,
    // videoDetails,
  }
}

const storeVideo = async (url: string, filename: string) => {
  ytdl(url)
  .pipe(fs.createWriteStream(filename));
}

(async () => {
  const channel = '@sciencefrontier852';

  const videoIds = await getVideoIds(channel);
  const videoDetails = await Promise.all(videoIds.map(getVideoDetails));
  console.log("hello", videoDetails);
})();
