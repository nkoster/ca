'use strict';

/*
 process.on('uncaughtException', function (err) {
 console.error((new Date()) + ' Server cannot load');
 process.exit();
 });
*/

const
    log = true,
    host = 'localhost',
    https = require('https'),
    fs = require('fs'),
    qs = require('querystring'),
    options = {
        key: fs.readFileSync('k.pem'),
        cert: fs.readFileSync('c.pem')
    };

let port_https = 10443;
if (process.argv.indexOf("-https") !== -1) {
    port_https = process.argv[process.argv.indexOf("-https") + 1];
}

const server = https.createServer(options, function (req, res) {
    let postData = '';
    let csrResponse = '';
    if (req.method === 'POST') {
        let body = '';
        req.on('data', function(chunk) {
            body += chunk;
        });
        req.on('end', function() {
            postData = qs.parse(body);
            if (log)
                console.log((new Date()) + ' ' + req.connection.remoteAddress + ' CSR: ' + postData.csr);
            const stream = fs.createWriteStream("/tmp/csr.pem");
            stream.once('open', function() {
                stream.write(postData.csr);
                stream.end();
            });
            const { spawn } = require('child_process');
            const openssl = spawn('cat', ['/tmp/csr.pem']);
            openssl.stdout.on('data', (data) => {
                csrResponse += data;
            });
            res.end(csrResponse);
        });
    }
    let
        fileToLoad = '',
        contentType = 'text/html';
    if (req.url === '/') {
        fileToLoad = 'public/index.html';
    } else {
        fileToLoad = 'public' + req.url;
    }
    let
        re = /(?:\.([^.]+))?$/,
        ext = re.exec(fileToLoad)[1];
    if (ext === 'js') {
        contentType = 'application/javascript'
    } else if (ext === 'css') {
        contentType = 'text/css'
    } else if (ext === 'png') {
        contentType = 'image/png'
    } else if (ext === 'svg') {
        contentType = 'image/svg+xml'
    }
    if (fs.existsSync(fileToLoad)) {
        if (log) console.log((new Date()) + ' ' + req.connection.remoteAddress + ' URI: ' +
            fileToLoad + ' (' + contentType + ')');
        res.writeHeader(200, {"Content-Type": contentType});
        fs.readFile(fileToLoad, 'utf8', function (err, data) {
            if (err) {
                if (log) return console.log((new Date()) + ' ' + err);
            }
            if (postData.csr) res.write("<h4>CSR received.</h4>");
            res.end(data);
        });
    } else {
        if (log) console.log((new Date()) + ' ' + req.connection.remoteAddress + ' not found: ' + fileToLoad);
        res.writeHeader(404, {"Content-Type": "text/html"});
        res.write("404 Not Found\n");
        res.end();
    }
});

server.listen(port_https, function () {
    console.log((new Date()) + ' https server started at ' + host + ':' + port_https);
});