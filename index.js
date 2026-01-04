const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('Welcome to MyConverterrBot! Send me a video and I will fix its audio.'));

bot.on('video', async (ctx) => {
  const fileId = ctx.message.video.file_id;
  const fileInfo = await ctx.telegram.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${fileInfo.file_path}`;

  const inputPath = path.join(__dirname, 'input.mp4');
  const outputPath = path.join(__dirname, 'output.mp4');

  const res = await fetch(fileUrl);
  const fileStream = fs.createWriteStream(inputPath);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });

  try {
    ctx.reply('Converting...');
    execSync(`ffmpeg -i ${inputPath} -c:v copy -c:a aac -b:a 128k ${outputPath}`);
    await ctx.replyWithVideo({ source: fs.createReadStream(outputPath) });
  } catch (error) {
    console.error(error);
    ctx.reply('❌ Conversion failed!');
  } finally {
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  }
});

bot.launch();
