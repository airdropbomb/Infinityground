const fs = require('fs');
const axios = require('axios');
const cfonts = require('cfonts');
const chalk = require('chalk');

const token = fs.readFileSync('token.txt', 'utf8').trim();

const api = axios.create({
  baseURL: 'https://api.infinityg.ai/api/v1',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Origin': 'https://www.infinityg.ai',
    'Referer': 'https://www.infinityg.ai/'
  }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function formatResponse(response) {
  if (response.code === '90000' && response.message === '成功') {
    return {
      ...response,
      message: 'Success',
      status: 'Operation completed successfully'
    };
  }
  return response;
}

async function dailyCheckIn() {
  try {
    const response = await api.post('/task/checkIn/');
    const formattedResponse = formatResponse(response.data);
    console.log('Daily check-in:', formattedResponse);
    return formattedResponse;
  } catch (error) {
    console.error('Check-in error:', error.response?.data || error.message);
    return null;
  }
}

async function getTaskList() {
  try {
    const response = await api.post('/task/list');
    const formattedResponse = formatResponse(response.data);
    console.log('Task list retrieved:', formattedResponse);
    return formattedResponse;
  } catch (error) {
    console.error('Get task list error:', error.response?.data || error.message);
    return null;
  }
}

async function completeTask(taskId) {
  try {
    const response = await api.post('/task/complete', { taskId });
    const formattedResponse = formatResponse(response.data);
    console.log(`Task ${taskId} completed:`, formattedResponse);
    return formattedResponse;
  } catch (error) {
    console.error(`Complete task ${taskId} error:`, error.response?.data || error.message);
    return null;
  }
}

async function claimTask(taskId) {
  try {
    const response = await api.post('/task/claim', { taskId });
    const formattedResponse = formatResponse(response.data);
    console.log(`Task ${taskId} claimed:`, formattedResponse);
    return formattedResponse;
  } catch (error) {
    console.error(`Claim task ${taskId} error:`, error.response?.data || error.message);
    return null;
  }
}

async function runBot() {
  try {
    // Logo
    cfonts.say('ADB Node', {
      font: 'block',
      align: 'center',
      colors: ['cyan', 'magenta'],
      background: 'black',
      letterSpacing: 1,
      lineHeight: 1,
      space: true,
      maxLength: '0',
    });

    console.log(chalk.green("=== Telegram Channel : InfinityG Bot ( @infinitygbot ) ===\n"));

    console.log('Starting InfinityG bot...');
    
    const checkInResult = await dailyCheckIn();
    if (!checkInResult) {
      console.log('Skipping further tasks due to check-in failure');
      return;
    }
    await sleep(5000); 

    const taskList = await getTaskList();
    if (!taskList || !taskList.data?.taskModelResponses) {
      console.log('Skipping tasks due to task list retrieval failure');
      return;
    }
    await sleep(5000);
    
    // Dynamic task ID filtering
    const taskIds = taskList.data.taskModelResponses
      .flatMap(model => model.taskResponseList)
      .filter(task => task.status === 0 || task.status === 2)
      .map(task => task.taskId);
    
    console.log('Dynamically selected task IDs:', taskIds);

    if (taskIds.length === 0) {
      console.log('No available tasks to process');
      return;
    }

    for (const taskId of taskIds) {
      console.log(`Processing task ID: ${taskId}`);
      const completeResult = await completeTask(taskId);
      await sleep(5000);
      
      if (completeResult && completeResult.message === 'Success') {
        await claimTask(taskId);
      } else {
        console.log(`Skipping claim for task ID ${taskId} due to completion failure`);
      }
      await sleep(5000);
    }
    
    console.log('Bot tasks completed successfully');
  } catch (error) {
    console.error('Bot error:', error);
  }
}

function getTimeUntilNextRun() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 1, 0, 0); 
  return tomorrow - now;
}

function formatTimeRemaining(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  const hours = Math.floor((ms / 1000 / 60 / 60) % 24);
  return `${hours}h ${minutes}m ${seconds}s`;
}

async function runBotWithCountdown() {
  while (true) {
    await runBot();
    
    let timeUntilNext = getTimeUntilNextRun();
    console.log(`\nNext run in ${formatTimeRemaining(timeUntilNext)}`);
    
    const countdownInterval = setInterval(() => {
      timeUntilNext -= 1000;
      process.stdout.write(`\rTime until next run: ${formatTimeRemaining(timeUntilNext)}`);
      
      if (timeUntilNext <= 0) {
        clearInterval(countdownInterval);
        process.stdout.write('\n');
      }
    }, 1000);
    
    await sleep(timeUntilNext);
  }
}

console.log('Starting bot with countdown timer...');
runBotWithCountdown();
