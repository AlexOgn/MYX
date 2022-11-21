const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();
const port = 3000;
const http = require('http');
const cors = require('cors');
const server = http.createServer(app);

const sharp = require('sharp');

var im = require('imagemagick');
var fs = require('fs');

var ExifImage = require('exif').ExifImage;

var path = require('path');

app.use(cors())
app.use(
    fileUpload({
        limits: {
            fileSize: 100000000, // Around 100MB
        },
        abortOnLimit: true,
    })
);

function imageExists(imagePath) {
    return fs.existsSync(imagePath);
}

app.post('/uploadImage', function (req, res) {
    const { image } = req.files;

    if (!image) return res.sendStatus(400);
    if (imageExists(`${__dirname}/upload/${image.name}`)) return res.sendStatus(400);

    image.mv(__dirname + '/upload/' + image.name);

    res.sendStatus(200);
})

app.delete('/deleteImage', function (req, res) {
    let imageName = req.query.image;
    let imagePath = `${__dirname}/upload/${imageName}`;
    let thumbnailPath = `${__dirname}/upload/_${imageName}`;

    if (imageExists(imagePath)) {
        fs.unlink(imagePath, (err) => {
            if (err) {
                res.sendStatus(400);
                throw err;
            }
        });
    } else {
        return res.sendStatus(404);
    }

    if (imageExists(thumbnailPath)) {
        fs.unlink(thumbnailPath, (err) => {
            if (err) {
                res.sendStatus(400);
                throw err;
            }
        });
    }

    res.sendStatus(200);
})

app.get("/getThumbnail", async function (req, res) {
    let imageName = req.query.image;
    let imagePath = `${__dirname}/upload/${imageName}`;
    let thumbnailPath = `${__dirname}/upload/_${imageName}`;

    if (!imageExists(imagePath)) {
        return res.sendStatus(404);
    }

    if (imageExists(thumbnailPath)) {
        return res.sendFile(thumbnailPath);
    }

    await sharp(imagePath).resize({ height: 256, width: 256 })
        .toFile(thumbnailPath)
        .catch(function (err) {
            console.log("Error occured");
        });

    res.sendFile(imagePath);
    res.sendFile(thumbnailPath);
})

function getBox(point1, point2) {
    let top = point1.lat > point2.lat ? point1.lat : point2.lat;
    let bottom = point1.lat < point2.lat ? point1.lat : point2.lat;
    let right = point1.lon > point2.lon ? point1.lon : point2.lon;
    let left = point1.lon < point2.lon ? point1.lon : point2.lon;

    return { "top": top, "bottom": bottom, "right": right, "left": left };
}

function isInBox(point, box) {
    return (point.lat <= box.top && point.lat >= box.bottom
        && point.lon <= box.right && point.lon >= box.left);
}

app.get("/getImage", async function (req, res) {
    let imageName = req.query.image;
    let imagePath = `${__dirname}/upload/${imageName}`;

    try {
        if (!imageExists(imagePath)) {
            return res.sendStatus(404);
        }
    } catch (err) {
        console.error(err)
    }

    return res.sendFile(imagePath);
})

app.get("/box", async function (req, res) {
    let point1 = { "lat": req.query.lat1, "lon": req.query.lon1 };
    let point2 = { "lat": req.query.lat2, "lon": req.query.lon2 };
    let box = getBox(point1, point2);

    let images = [];

    let files = fs.readdirSync(`${__dirname}/upload`);

    for (let i = 0; i < files.length; i++) {
        let file = files[i];

        if (file.startsWith("_")) {
            return;
        }

        //tuka gledam lat lon ala bala putki maini
        let promise = await new Promise(async (resolve) => {
            await new ExifImage({ image: `${__dirname}/upload/${file}` }, function (error, exifData) {
                if (error) {
                    // console.log('Error: ' + error.message);
                } else {
                    let latdeg = exifData.gps.GPSLatitude[0];
                    let latmin = exifData.gps.GPSLatitude[1];
                    let latsec = exifData.gps.GPSLatitude[2];

                    let latDecimal = latdeg + (latmin / 60) + (latsec / 3600);

                    let londeg = exifData.gps.GPSLongitude[0];
                    let lonmin = exifData.gps.GPSLongitude[1];
                    let lonsec = exifData.gps.GPSLongitude[2];

                    let lonDecimal = londeg + (lonmin / 60) + (lonsec / 3600);

                    if (exifData.gps.GPSLatitudeRef == 'S') {
                        latDecimal = -latDecimal;
                    }

                    if (exifData.gps.GPSLongitudeRef == 'W') {
                        lonDecimal = -lonDecimal
                    }

                    let point = { "lat": latDecimal, "lon": lonDecimal };

                    if (isInBox(point, box)) {
                        //tva console.log-va kato horata, ama ne se addva apparently
                        console.log(`${file}: ${latDecimal}, ${latDecimal}`);
                        resolve(true);
                    } else {
                        resolve(false);
                    }

                }
            });
        });

        //vutre vuv foreach, izvun promise alabala
        if (promise == true) {
            console.log(i)
            images.push(file);
        }
    }

    console.log("casdf" + images);
    res.send(images);
})

server.listen(port, () => {
    console.log('listening on *:3000');
});
