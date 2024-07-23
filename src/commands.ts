import { program } from "commander";

import { IControl } from "./control.type";
import { getAugmentedDate, getDateAtStdTime } from "./date";

interface ICommandResult extends IControl {
  isInteractive: boolean;
  playlistId: string;
  videoId: string;
}


export const getCommands = (): ICommandResult => {
  program
  .name("better-youtube-habbiti-cli")
  .description("CLI to download youtube video. By default run daily job.")
  .version("1.0.0");

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  program
  .option('-c --channelFilepath <channelFilepath>', 'Channels file', './channels.json')
  .option(
    '-f --fromDate <fromDate>',
    'Downloading from this date(yyyy-mm-dd).',
    (dateStr: string) => getAugmentedDate(dateStr),
    yesterday.toISOString().split("T")[0]
  )
  .option('-i --interactive', 'Start interactive interface.')
  .option('-p --playlistId <playlistId>', 'Playlist ID.', "")
  .option('-o --outputDir <outputDir>', 'Directory to outputs.', './outputs')
  .option(
    '-t --toDate <toDate>',
    'Downloading until this date(yyyy-mm-dd).',
    (dateStr: string) => getAugmentedDate(dateStr),
    today.toISOString().split("T")[0]
  )
  .option('-v --videoId <videoId>', 'Video ID.', "")
  ;
  

  program.parse();

  const options = program.opts();
  const channelFilepath = options.channelFilepath;
  const fromDate = getDateAtStdTime(options.fromDate);
  const isInteractive = options.interactive;
  const playlistId = options.playlistId;
  const outputDir = options.outputDir;
  const toDate = getDateAtStdTime(options.toDate);
  const videoId = options.videoId;

  return { channelFilepath, isInteractive, playlistId, outputDir,fromDate, toDate, videoId };
}
