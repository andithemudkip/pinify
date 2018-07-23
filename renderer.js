// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// const appId = 'pinify-windows';
// const {ToastNotification} = require('electron-windows-notifications');
// let notification = new ToastNotification({
//     appId: appId,
//     template: `<toast><visual><binding template="ToastText01"><text id="1">%s</text></binding></visual></toast>`,
//     strings: ['Hi!']
// })
// console.log(notification);
// notification.on('activated', () => console.log('Activated!'))
// notification.show()
// const WindowsToaster = require('node-notifier').WindowsToaster;

// var notifier = new WindowsToaster({
//    withFallback: false, // Fallback to Growl or Balloons? 
//    customPath: void 0 // Relative path if you want to use your fork of toast.exe 
// });

// notifier.notify({
//    title: "Title",
//    message: "Message",
//    icon: "c:/path/image.png", // Absolute path to Icon 
//    sound: true, // true | false. 
//    wait: true, // Wait for User Action against Notification 
// }, function(error, response) {
//    console.log(response);
// });

// notifier.on('click', function (notifierObject, options) {
//     // Triggers if `wait: true` and user clicks notification
//     alert("Callback triggered");
// });