import request = require("request");

// let options = {
//     url: "http://localhost:8080/owner/create",
//     body: {
//         group: "ANONYMOUS",
//     },
//     json: true
// };

// let options = {
//     url: `http://localhost:8080/owner/5869c2c316aaa805d835f94a/update`,
//     // url: `http://localhost:8080/owner/5869c2c316aaa805d835f94b/update`,
//     body: {
//         email: "ilovegadd@gmail.com",
//     },
//     json: true
// };

// let options = {
//     url: "http://localhost:8080/transaction/start",
//     body: {
//         owners: ["5868e16789cc75249cdbfa4b", "5869c2c316aaa805d835f94a"]
//     },
//     json: true
// };

// let options = {
//     url: "http://localhost:8080/transaction/5869f39ae5b370089c78f386/close",
//     body: {
//         password: "password"
//     },
//     json: true
// };

let options = {
    url: "http://localhost:8080/transaction/5869f374d07cec157c6000c8/authorize",
    body: {
        password: "password",
        owner: "5868e16789cc75249cdbfa4b",
        // asset: "12345",
        authorization_group: "COA",
        performance: "001201701038561032040",
        reservations: [
            {
                section: "0",
                seat_code: "Ｃ－７"
            },
            {
                section: "0",
                seat_code: "Ｃ－８"
            }
        ]
    },
    json: true
};

request.post(options, (error, response, body) => {
    console.log(body);
});
