export enum ChannelType {
  Economics = "Economics",
  Entertainment = "Entertainment",
  Music = "Music",
  Gaming = "Gaming",
  Podcast = "Podcast",
  Politics = "Politics",
  Science = "Science",
  History = "History",
}


export interface Channel {
  id: string;
  types: ChannelType[];
}

export const channels: Channel[] = [
  // {
  //   id: "@dwnews",
  //   types: [ChannelType.Politics, ChannelType.Podcast],
  // },
  {
    id: "@Caedrel",
    types: [ChannelType.Entertainment, ChannelType.Gaming],
  },
  {
    id: "@simonglobal",
    types: [ChannelType.History, ChannelType.Politics, ChannelType.Podcast],
  },
  {
    id: "@gctalk",
    types: [ChannelType.History, ChannelType.Politics, ChannelType.Podcast],
  },
  {
    id: "@WhirlingCloudsValley",
    types: [ChannelType.History, ChannelType.Politics, ChannelType.Podcast],
  },
  {
    id: "@sciencefrontier852",
    types: [ChannelType.Science, ChannelType.Podcast],
  },
  {
    id: "@wenzhaoofficial",
    types: [ChannelType.Politics, ChannelType.Podcast],
  },
  {
    id: "@deepestjapan",
    types: [ChannelType.Entertainment, ChannelType.History, ChannelType.Podcast],
  },
  {
    id: "@ccnewshk",
    types: [ChannelType.Economics, ChannelType.Politics, ChannelType.Podcast],
  },
  {
    id: "@EconomicsExplained",
    types: [ChannelType.Economics, ChannelType.Politics, ChannelType.Podcast],
  },
  {
    id: "@Fireship",
    types: [ChannelType.Science, ChannelType.Podcast],
  },
  {
    id: "@utopia_pictures",
    types: [ChannelType.Entertainment],
  },
  {
    id: "@The_Goose_Media",
    types: [ChannelType.Economics, ChannelType.Politics, ChannelType.Podcast],
  },
  {
    id: "@eons",
    types: [ChannelType.Science, ChannelType.Podcast],
  },
  {
    id: "@Herostory",
    types: [ChannelType.History, ChannelType.Podcast],
  },
  {
    id: "@mylittleairport",
    types: [ChannelType.Entertainment, ChannelType.Music],
  },
  {
    id: "@realscience",
    types: [ChannelType.Science, ChannelType.Podcast],
  },
  {
    id: "@badboycorner",
    types: [ChannelType.Entertainment, ChannelType.Gaming],
  },
]

