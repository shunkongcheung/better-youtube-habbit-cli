import clear from "clear";
import fetch from "cross-fetch";
import fs from "fs";
import * as inquirer from '@inquirer/prompts';
import minimist from "minimist";
import sanitize from "sanitize-filename";
import ytdl from 'ytdl-core';

import { channels, ChannelType } from "./channels";

interface IVideoDetail {
  videoId: string;
  lengthSeconds: string;
  title: string;
  thumbnail: string,
  uploadDate: string;
}

const getUnique = (arr: string[]) => [...new Set(arr)];

const getUrlFromId = (videoId: string) =>  `http://www.youtube.com/watch?v=${videoId}`;

function slugify(title: string) {
  return sanitize(title);
}

const getVideoIds = async (channel: string) => {
  const url = `https://www.youtube.com/${channel}/videos`;
    const response = await fetch(url);
  const body = await response.text();

  const result = body.match(/ytInitialData = {.*};<\/script>/)[0];
  const rawVideoIds = [...result.matchAll(/"videoId":"(.{1,16})","/g)];

  const videoIds = rawVideoIds.map(result => result[1]);

  return getUnique(videoIds);
}


const getVideoDetails = async (videoId: string): Promise<IVideoDetail> => {
  const url = getUrlFromId(videoId);
  try {
  const { videoDetails } = await ytdl.getBasicInfo(url)
  return {
    videoId,
    lengthSeconds: videoDetails.lengthSeconds,
    title: videoDetails.title,
    thumbnail: videoDetails.thumbnails[0]?.url,
    uploadDate: videoDetails.uploadDate,
  };
  }catch(err) {
    return null;
  }
}

const storeVideo = async (videoId: string, filename: string) => {
  const isExist = fs.existsSync(filename);
  if(isExist) {
    return;
  }

  const url = getUrlFromId(videoId);

  const stream = ytdl(url).pipe(fs.createWriteStream(filename, { flags: 'a+' }));

  return new Promise(resolve => stream.on('finish', () => resolve("")));
}

const getVideoTypeFromPrompt = async (isDefault: boolean) => {
  const choices = Object.values(ChannelType).map(channelType => ({ name: channelType, value: channelType, checked: true }));

  if(isDefault) {
    return choices.map(item => item.value);
  }

  const answer = await inquirer.checkbox({
    message: "What video type would you like to fetch?",
    choices,
    pageSize: choices.length,
  });

  return answer;
}

const getChannelFromPrompt = async (channelTypes: ChannelType[], isDefault: boolean) => {
  const channelInTypes = channels.filter(({ types }) => types.some(type => channelTypes.some(channelType => channelType === type)));
  const choices = channelInTypes.map(channel => ({ name: channel.id, value: channel.id, checked: true }));

  if(isDefault) {
    return choices.map(item => item.value);
  }

  const answer = await inquirer.checkbox({
    message: "Which channel would you want to fetch?",
    choices,
    pageSize: choices.length,
  });

  return answer;
}

const getVideoDetailsFromPrompt = async (videoDetails: IVideoDetail[], isDefault: boolean) => {
  const choices = videoDetails.map(video => ({
    name: video.title,
    value: video.videoId,
    descrption: video.thumbnail,
    checked: true
  }));

  const answer = isDefault
    ? choices.map(item => item.value) 
    :await inquirer.checkbox({
    message: "Which video would you like to download?",
    choices,
    loop: false,
    pageSize: 10,
  });

  return videoDetails.filter(item => answer.includes(item.videoId));
}



(async () => {
  const outputDir = "./outputs";
  const args = minimist(process.argv);

  const isDaily = args.d || args.daily;

  if(!isDaily){
    clear();
  }

  const videoTypes = await getVideoTypeFromPrompt(isDaily);
  const channels = await getChannelFromPrompt(videoTypes, isDaily);

  for(let idx = 0; idx < channels.length; idx ++) {
    const channel = channels[idx];
    const videoIds = await getVideoIds(channel);
    const videoDetails = await Promise.all(videoIds.map(getVideoDetails));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const filteredVideoDetails = videoDetails
    .filter(item => !!item)
    .filter(item => !isDaily || new Date(item.uploadDate) >= yesterday)
    ;


    const confirmedDetails = await getVideoDetailsFromPrompt(filteredVideoDetails, isDaily);
    await Promise.all(confirmedDetails.map(({ videoId, title }) => {
      storeVideo(videoId, `${outputDir}/${slugify(title)}.mp4`);
    }))
  }

})();
