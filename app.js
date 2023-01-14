var express = require('express');
var cookieParser = require('cookie-parser');
var PORT = process.env.PORT || 3030;
var appInit = require('./controllers/appInit')
var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(function (req, res, next) {
    res.set('X-Powered-By', 'control-service');
    next();
});

if (process.env.ALLOW_CORS) {
    // app.use(cors());
    console.log('CORS Allowed')
}

app.use('/session', require('./routes/sessions'));

app.get('/live', (req, res) => {res.json({live: true});});
app.get('/*', (req, res) => {res.status(404).end('404');});


app.listen(PORT, (err) => {
    if (err) {
        console.log(err);
        return
    }
    console.log("Server is run successfully. PORT : ", PORT)
})

appInit()

module.exports = app;