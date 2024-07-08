const { Client, Intents } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { joinVoiceChannel, createAudioResource, createAudioPlayer, NoSubscriberBehavior, AudioPlayerStatus, } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { token, dj, targetChannel, clientID, guildID } = require('./config.json');


const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES],
  presence: {
    activities: [{ name: 'https://github.com/lezetho/YouTube-Radio!', type: 'WATCHING' }],
  },
});

const targetChannelId = targetChannel;
const allowedRoleId = dj;

const commands = [
  {
    name: 'play-radio',
    description: 'Turn on the radio!',
  },
];

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(`${clientID}`, `${guildID}`),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'play-radio') {
    const member = interaction.member;
    if (!member.roles.cache.has(allowedRoleId)) {
      return interaction.reply('You do not have the required role to use this command.');
    }

    const voiceChannel = member.voice.channel;

    if (!voiceChannel || (targetChannelId && voiceChannel.id !== targetChannelId)) {
      return interaction.reply('You need to be in the specified voice channel first!');
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      const videoUrls = [
        'https://www.youtube.com/watch?v=tPEE9ZwTmy0', // example URL
      ];

      let currentIndex = 0;

      while (true) {
        const videoUrl = videoUrls[currentIndex];

        try {
          console.log(`Fetching video information for ${videoUrl}...`);
          const stream = ytdl(videoUrl, { filter: 'audioonly' });
        
          if (!stream) {
            console.error(`Failed to get stream for ${videoUrl}. Skipping.`);
            continue;
          }
        
          const resource = createAudioResource(stream);
          const player = createAudioPlayer();
        
          player.on(AudioPlayerStatus.Idle, () => {
            console.log(`Finished playing ${videoUrl}`);
            currentIndex = (currentIndex + 1) % videoUrls.length;
          });
        
          player.on('error', error => {
            if (error.message.includes('Status code: 403')) {
              console.error(`Error playing ${videoUrl}, skipping and playing a different video`);
            } else {
              console.error(`Error in player for ${videoUrl}:`, error);
            }
            currentIndex = (currentIndex + 1) % videoUrls.length;
          });
        
          connection.subscribe(player);
          player.play(resource);
        
          await new Promise(resolve => {
            player.once(AudioPlayerStatus.Idle, () => {
              resolve();
            });
          });
        } catch (error) {
          console.error(`Error processing video ${videoUrl}:`, error);
        }        
      }
    } catch (error) {
      console.error('Error handling interaction:', error);
      interaction.reply('Failed to join voice channel.');
    }
  }
});

client.login(token);
