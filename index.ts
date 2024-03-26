import clear from "clear";
import { program } from "commander";
import fetch from "cross-fetch";
import fs from "fs";
import * as inquirer from '@inquirer/prompts';
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
  return new Promise((resolve, reject) => {
    ytdl(url)
    .on('finish', () => resolve(""))
    .on('error', (err: Error) => reject(err))
    .pipe(fs.createWriteStream(filename, { flags: 'a+' }));
  });

}

const getVideoTypeFromPrompt = async () => {
  const choices = Object.values(ChannelType).map(channelType => ({ name: channelType, value: channelType, checked: true }));

  const answer = await inquirer.checkbox({
    message: "What video type would you like to fetch?",
    choices,
    pageSize: choices.length,
  });

  return answer;
}

const getChannelFromPrompt = async (channelTypes: ChannelType[]) => {
  const channelInTypes = channels.filter(({ types }) => types.some(type => channelTypes.some(channelType => channelType === type)));
  const choices = channelInTypes.map(channel => ({ name: channel.id, value: channel.id, checked: true }));

  const answer = await inquirer.checkbox({
    message: "Which channel would you want to fetch?",
    choices,
    pageSize: choices.length,
  });

  return answer;
}

const getVideoDetailsFromPrompt = async (videoDetails: IVideoDetail[]) => {
  const choices = videoDetails.map(video => ({
    name: video.title,
    value: video.videoId,
    descrption: video.thumbnail,
    checked: true
  }));

  const answer = await inquirer.checkbox({
    message: "Which video would you like to download?",
    choices,
    loop: false,
    pageSize: 10,
  });

  return videoDetails.filter(item => answer.includes(item.videoId));
}

const runInteractive = async () => {
  const videoTypes = await getVideoTypeFromPrompt();
  const channels = await getChannelFromPrompt(videoTypes);

  const videoDetailsMap: Record<string, IVideoDetail[]> = {};

  for(let idx = 0; idx < channels.length; idx ++) {
    const channel = channels[idx];
    const videoIds = await getVideoIds(channel);
    const videoDetails = await Promise.all(videoIds.map(getVideoDetails));

    const filteredVideoDetails = videoDetails.filter(item => !!item);
    const confirmedDetails = await getVideoDetailsFromPrompt(filteredVideoDetails);

    videoDetailsMap[channel] = confirmedDetails;
  }

  return videoDetailsMap;
}

const getDailyVideoDetails = async () => {
  const videoDetailsMap: Record<string, IVideoDetail[]> = {};

  console.log(`Start fetching video ID for ${channels.length} channel(s).`);
  for(let idx = 0; idx < channels.length; idx ++) {
    const channel = channels[idx];
    const videoIds = await getVideoIds(channel.id);
    const videoDetails = await Promise.all(videoIds.map(getVideoDetails));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const filteredVideoDetails = videoDetails
    .filter(item => !!item)
    .filter(item => new Date(item.uploadDate) > yesterday);

    videoDetailsMap[channel.id] = filteredVideoDetails;
    console.log(`[(${idx+1}/${channels.length})${channel.id}] fetched ${filteredVideoDetails.length} video.`);
  }

  return videoDetailsMap;
}

const storeVideoDetails = async (videoDetailsMap: Record<string, IVideoDetail[]>, outputDir: string) => {
  // start fetching
  const targetChannels = Object.keys(videoDetailsMap);
  let totalSuccessCount = 0;
  const channelCount = targetChannels.length;
  console.log(`Fetching ${channelCount} channels...`);

  for(let idx = 0; idx < channelCount; idx ++) {
    const targetChannelId = targetChannels[idx];
    const videoDetails = videoDetailsMap[targetChannelId];

    const channelDisplayName = `[(${idx+1}/${channelCount})${targetChannelId}]`;

    let channelSuccessCount = 0;
    console.log(`${channelDisplayName}: fetching ${videoDetails.length} videos...`);

    for(let jdx = 0; jdx < videoDetails.length; jdx ++) {
      const { videoId, title } = videoDetails[jdx];
      const videoFileName = `${slugify(title)}.mp4`;
      const videoDisplayName = `(${jdx+1}/${videoDetails.length}) ${videoFileName}`;
      const videoFullpath =  `${outputDir}/${videoFileName}`;

      try {
        await storeVideo(videoId,videoFullpath);
        console.log(`${channelDisplayName}: completed ${videoDisplayName}`);
        channelSuccessCount ++;
      } catch (err){
        if(fs.existsSync(videoFullpath)) {
          fs.unlinkSync(videoFullpath);
        }
        console.log(`${channelDisplayName}: failed ${videoDisplayName}(${videoId}) - ${err}`);

      }
    }
    console.log(`${channelDisplayName}: completed ${channelSuccessCount}/${videoDetails.length} videos...`);
    totalSuccessCount += channelSuccessCount;
  }

  console.log(`Finished. completed ${totalSuccessCount} videos for all target channels`);
}



(async () => {
  const outputDir = "./outputs";
  if(!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir);
  }

  program
  .name("better-youtube-habbiti-cli")
  .description(`CLI to download youtube video. By default run daily job.`)
  .version("1.0.0");

  program.option('-i --interactive', 'Start interactive interface');


  program.parse();

  const options = program.opts();
  const isInteractive = options.interactive;

  clear(); // clear terminal

  const videoDetailsMap = isInteractive
    ? await runInteractive()
    : await getDailyVideoDetails();

    await storeVideoDetails(videoDetailsMap, outputDir);
})();
