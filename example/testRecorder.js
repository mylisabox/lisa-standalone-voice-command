import GoogleDetector from "../lib/detectors/google.js";

//const recorder = new VoskDetector();
const recorder = new GoogleDetector();

setTimeout(async () => {
  console.log('paused');
  await recorder.pause();
  setTimeout(async () => {
    console.log('resumed');
    await recorder.resume();
  }, 10000);
}, 5000);

async function main() {

  await recorder.init({
    language: 'fr-FR',
  });
  await recorder.start();
  recorder.on('result', (data) => {
    console.log('result: ' + data);
  });
  recorder.on('partial', (data) => {
    console.log('partial: ' + data);
  });

}

main().then(r => null);

process.on('SIGINT', async function () {
  console.log("Done");
  await recorder.stop();
});
