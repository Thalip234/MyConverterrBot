const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('👋 Welcome to MyConverterrBot!\nSend me a video and I’ll fix its audio so it plays correctly in Telegram.');
});

bot.on('video', async (ctx) => {
  const fileId = ctx.message.video.file_id;

  // Get file info from Telegram
  const fileInfo = await ctx.telegram.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${fileInfo.file_path}`;

  // File paths
  const inputPath = path.join(__dirname, 'input.mp4');
  const outputPath = path.join(__dirname, 'output.mp4');

  try {
    // Download file
    const res = await fetch(fileUrl);
    const fileStream = fs.createWriteStream(inputPath);
    await new Promise((resolve, reject) => {
      res.body.pipe(fileStream);
      res.body.on("error", reject);
      fileStream.on("finish", resolve);
    });

    await ctx.reply('🔄 Converting audio...');

    // Run ffmpeg: copy video, convert audio to AAC
    execSync(`ffmpeg -i ${inputPath} -c:v copy -c:a aac -b:a 128k ${outputPath}`);

    // Send the converted video
    await ctx.replyWithVideo({ source: fs.createReadStream(outputPath) });

  } catch (error) {
    console.error(error);
    await ctx.reply('❌ Something went wrong during conversion.');
  } finally {
    // Clean up
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
});

bot.launch();
