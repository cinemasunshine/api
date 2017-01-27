"use strict";
const notification_1 = require("../domain/default/service/interpreter/notification");
const email_1 = require("../domain/default/model/email");
const objectId_1 = require("../domain/default/model/objectId");
let email = new email_1.default(objectId_1.default(), "test@localhost", "ilovegadd@gmail.com", "test subject", `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<title>購入完了</title>
</head>
<body>
<div style="padding:0 30px;font-family:'游ゴシック',meiryo,sans-serif;">
    <p style="font-size:14px;">
        この度はご購入いただき誠にありがとうございます。<br>
    </p>
    <hr style="margin:1em 0;">
    <div style="margin-bottom:1em;">
        <h3 style="font-weight:normal;font-size:14px;margin:0;">購入番号 (Transaction number) :</h3>
        <strong>12345678</strong>
    </div>
</div>
</body>
</html>
`);
notification_1.default.sendEmail(email).then(() => {
    console.log("sent.");
}).catch((err) => {
    console.error(err);
});