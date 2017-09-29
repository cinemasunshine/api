
const request = require("request-promise-native");

// const accessToken = 'eyJraWQiOiJ0U3dFVmJTa0IzZzlVY01YajBpOWpISGRXRk9FamsxQUNKOHZrZ3VhV0lzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJjcThlbTc5aWxlZXFsY3A2cTVra2Q0NDZuIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJodHRwczpcL1wvc3NrdHMtYXBpLWRldmVsb3BtZW50LmF6dXJld2Vic2l0ZXMubmV0XC9ldmVudHMucmVhZC1vbmx5IGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL29yZ2FuaXphdGlvbnMucmVhZC1vbmx5IGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL3RyYW5zYWN0aW9ucyIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5hcC1ub3J0aGVhc3QtMS5hbWF6b25hd3MuY29tXC9hcC1ub3J0aGVhc3QtMV96VGhpMGoxZmUiLCJleHAiOjE1MDM5MTU3OTgsImlhdCI6MTUwMzkxMjE5OCwidmVyc2lvbiI6MiwianRpIjoiODJkMWIyNjUtMDEwNy00MzNmLWJlODktZmIzYzBlYTMwYTFmIiwiY2xpZW50X2lkIjoiY3E4ZW03OWlsZWVxbGNwNnE1a2tkNDQ2biJ9.3y8sIvNS7h8UvGUInhzf8XKlPvwc0UbT6cudB-XjIRZt9zugP3jSUdYLvWOUhlZ1hjUgb0Ppml6a662UQC0ku3wvgMXHBdM3kStIkwMIYU8ZJ0yf-Nf53qOREX1bis4BayQCtZCAyrPKnLEPrX7PvV2EJKf-NaGfKlvf1vth4XJENhJMHhkTQh-HMGY73szdSsu7NcpBAN2c5zBe87VIPL1DFh9mv97BoKSEyvzaDNEIGja_GY2qYL09vsfOLUODxyJemtPJKSjQFrzNueXr6xib-bNleBEcMW0nWgdisjv2gBTeU2drE6aIu4F4Tl822YoGFec2Q5czRKN0jN4BeQ';
const accessToken = '3A2cTVra2Q0NDZuIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJodHRwczpcL1wvc3NrdHMtYXBpLWRldmVsb3BtZW50LmF6dXJld2Vic2l0ZXMubmV0XC9ldmVudHMucmVhZC1vbmx5IGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL29yZ2FuaXphdGlvbnMucmVhZC1vbmx5IGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL3RyYW5zYWN0aW9ucyIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5hcC1ub3J0aGVhc3QtMS5hbWF6b25hd3MuY29tXC9hcC1ub3J0aGVhc3QtMV96VGhpMGoxZmUiLCJleHAiOjE1MDM5MTU3OTgsImlhdCI6MTUwMzkxMjE5OCwidmVyc2lvbiI6MiwianRpIjoiODJkMWIyNjUtMDEwNy00MzNmLWJlODktZmIzYzBlYTMwYTFmIiwiY2xpZW50X2lkIjoiY3E4ZW03OWlsZWVxbGNwNnE1a2tkNDQ2biJ9.3y8sIvNS7h8UvGUInhzf8XKlPvwc0UbT6cudB-XjIRZt9zugP3jSUdYLvWOUhlZ1hjUgb0Ppml6a662UQC0ku3wvgMXHBdM3kStIkwMIYU8ZJ0yf-Nf53qOREX1bis4BayQCtZCAyrPKnLEPrX7PvV2EJKf-NaGfKlvf1vth4XJENhJMHhkTQh-HMGY73szdSsu7NcpBAN2c5zBe87VIPL1DFh9mv97BoKSEyvzaDNEIGja_GY2qYL09vsfOLUODxyJemtPJKSjQFrzNueXr6xib-bNleBEcMW0nWgdisjv2gBTeU2drE6aIu4F4Tl822YoGFec2Q5czRKN0jN4BeQ';
console.log(accessToken);
request.get({
    url: `http://localhost:8081/events/individualScreeningEvent/123`,
    auth: { bearer: accessToken },
    json: true,
    simple: false,
    resolveWithFullResponse: true
}).then((response) => {
    console.log('response:', response.statusCode, response.body);
}).catch((error) => {
    console.error(error);
});;