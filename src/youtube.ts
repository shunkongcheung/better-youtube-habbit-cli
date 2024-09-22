// import fs from "fs";
import fetch from "cross-fetch";
import ytdl from "@distube/ytdl-core";

export interface IVideoDetail {
  videoId: string;
  title: string;
  uploadDate: Date;
}

const getUrlFromId = (videoId: string) =>
  `http://www.youtube.com/watch?v=${videoId}`;

const getUnique = (arr: string[]) => [...new Set(arr)];

// const getYtInitialDataFromHtml = (fileText: string) => {
//   const ytInitialDataMatch = fileText.match(/ytInitialData = ({.+});<\/script>/);
//   const ytInitialDataText = ytInitialDataMatch[0].replace("ytInitialData = ", "").replace(";</script>", "");
//   const ytInitialData = JSON.parse(ytInitialDataText);
//   return ytInitialData;
// }

// const getYtPlayerResponseFromHtml = (fileText: string) => {
//   const ytDataMatch = fileText.match(/ytInitialPlayerResponse = ({.+});/);

//   let ytDataText = ytDataMatch[0].replace("ytInitialPlayerResponse = ", "");
//   ytDataText = ytDataText.slice(0, ytDataText.length - 1);

//   const ytData = JSON.parse(ytDataText);
//   return ytData;
// }

// (async () => {
//   const request = await fetch("https://www.youtube.com/watch?v=jSayIEKr78w");
//   const file = await request.text();
//   const ytInitialData = getYtInitialDataFromHtml(file);
//   fs.writeFileSync("./test.json", JSON.stringify(ytInitialData, null, 4));
// })()

const getIdsFromHtml = (htmlText: string) => {
  const result = htmlText.match(/ytInitialData = {.*};<\/script>/)[0];
  const rawVideoIds = [...result.matchAll(/"videoId":"(.{1,16})","/g)];
  const videoIds = rawVideoIds.map((result) => result[1]);
  return getUnique(videoIds);
};

export const getChannelVideoIds = async (channelId: string) => {
  const url = `https://www.youtube.com/${channelId}/videos`;
  const response = await fetch(url);
  const body = await response.text();
  return getIdsFromHtml(body);
};

export const getPlayListVideoIds = async (playlistId: string) => {
  const url = `https://www.youtube.com/playlist?list=${playlistId}`;
  const response = await fetch(url);
  const body = await response.text();
  return getIdsFromHtml(body);
};

export const getVideoDetails = async (
  videoId: string,
): Promise<IVideoDetail> => {
  const url = getUrlFromId(videoId);
  try {
    const { videoDetails } = await ytdl.getBasicInfo(url);
    return {
      videoId,
      title: videoDetails.title,
      uploadDate: new Date(videoDetails.uploadDate),
    };
  } catch (err) {
    return null;
  }
};

export const getVideoStream = async (videoId: string) => {
  const url = getUrlFromId(videoId);
  const iTag = 18; // 360p + audio
  return ytdl(url, { filter: (format) => format.itag === iTag });
};
