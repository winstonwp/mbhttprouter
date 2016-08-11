var os = require('os');
var http = require('http');
var fs = require('fs');
var uuid = require('uuid');
var winston = require('winston');
var guessType = require("guess-content-type");

var PORT = 8080,
    DEST_URL = '';
var tmp_dir = os.tmpdir() + '/mbroute/';
winston.add(winston.transports.File, {
    filename: '/var/log/mbroute.log'
});

function handleRequest(request, response) {
    var uuname = uuid.v4();
    var file_path = tmp_dir + uuname
    var file = fs.createWriteStream(file_path);
    var url = DEST_URL + request.url;
    http.get(url, function(res) {
        if (res.statusCode === 200) {
            res.pipe(file).on('close', function() {
                var readStream = fs.createReadStream(file_path);
                var stat = fs.statSync(file_path);
                var contentType = guessType(request.url);
                response.writeHead(200, {
                    'Content-Type': contentType,
                    'Content-Length': stat.size
                });
                readStream.pipe(response);
                readStream.on('end', function() {
                    fs.unlink(file_path);
                    winston.info('File uploaded to client: ' + request.url);
                });
            });
        } else {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });
            fs.unlink(file_path);
            response.end('Not Found');
            winston.error('BAD REQUEST: ' + request.url);
        }
    });
}

module.exports.start = function(port, dest_url){
    PORT = port | PORT;
    DEST_URL = dest_url;
    //Create tmp folder
    fs.stat(tmp_dir, function(err, stat) {
        if (err) {
            fs.mkdirSync(tmp_dir);
        }
        //Create a server
        var server = http.createServer(handleRequest);

        //Lets start our server
        server.listen(PORT, function() {});
    });
}
