const express = require('express');
const { Worker } = require('worker_threads');
const { Queue } = require('bullmq');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { fork } = require('child_process');
const myQueue = new Queue('myQueueName');
const app = express();
const port = 4000;

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: [new BullMQAdapter(myQueue)],
    serverAdapter: serverAdapter,
});

app.use(express.json());

app.get('/', (req, res) => {
    // const worker = new Worker('./worker.js');
    // worker.on('message', (data) => {
    //     return res.status(200).send(`Result: ${data}`);
    // });
    // worker.on('error', (err) => {
    //     return res.status(200).send(`Error: ${err.message}`);
    // });

    // Không nên chặn main thread, dùng worker thread  hay child process thì vẫn cần giao tiếp với main thread
    let total = 0;
    for (let i = 0; i < 20_000_000_000; i++) {
        total++;
    }
    return res.status(200).send(`Result: ${total}`);
});

app.get('/addJob', async (req, res) => {
    await myQueue.add('myJobName', [1, 2, 3, 4]);
    const worker = new Worker('./bullWorkerThread.js');
    worker.on('message', (message) => {
        console.log('Message from BullMQ worker:', message);
    });
    res.send('Job added to queue.');
});

app.get('/child', async (req, res) => {
    await myQueue.add('myJobName', [1, 2, 3, 4]);
    const child = fork('child.js');
    child.send(10);
    child.on('exit', (code) => {
        console.log('Child process exited with a code of ' + code);
    });
    child.on('message', (message) => {
        return res.json(message);
    });
    child.on('error', (error) => {
        console.log(error);
    });
});
app.use('/admin/queues', serverAdapter.getRouter());
app.listen(port, function () {
    console.log(`App listening on http://localhost:${port}`);
});
