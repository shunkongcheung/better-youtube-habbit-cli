import fetch from "cross-fetch";
import ytdl from 'ytdl-core';

export interface IVideoDetail {
  videoId: string;
  title: string;
  uploadDate: Date;
}

const getUrlFromId = (videoId: string) =>  `http://www.youtube.com/watch?v=${videoId}`;

const getUnique = (arr: string[]) => [...new Set(arr)];

export const getVideoIds = async (channel: string) => {
  const url = `https://www.youtube.com/${channel}/videos`;
    const response = await fetch(url);
  const body = await response.text();

  const result = body.match(/ytInitialData = {.*};<\/script>/)[0];
  const rawVideoIds = [...result.matchAll(/"videoId":"(.{1,16})","/g)];

  const videoIds = rawVideoIds.map(result => result[1]);

  return getUnique(videoIds);
}


export const getVideoDetails = async (videoId: string): Promise<IVideoDetail> => {
  const url = getUrlFromId(videoId);
  try {
  const { videoDetails } = await ytdl.getBasicInfo(url)
  return {
    videoId,
    title: videoDetails.title,
    uploadDate: new Date(videoDetails.uploadDate),
  };
  }catch(err) {
    return null;
  }
}


export const getVideoStream = async (videoId: string) => {
  const url = getUrlFromId(videoId);
  return ytdl(url);
}


