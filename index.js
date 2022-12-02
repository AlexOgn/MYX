const express = require("express");
const fileUpload = require("express-fileupload");
const app = express();
const http = require("http");
const cors = require("cors");
const server = http.createServer(app);

var fs = require("fs");
var ExifImage = require("exif").ExifImage;

const port = 3000;

const sharp = require("sharp");

const UPLOAD = `${__dirname}/upload/`

app.use(cors());
app.use(
    fileUpload({
        limits: {
            fileSize: 100000000,
        },
        abortOnLimit: true,
    })
);

function imageExists(imagePath) {
    return fs.existsSync(imagePath);
}

function getBox(point1, point2) {
    return {
        top: point1.lat > point2.lat ? point1.lat : point2.lat,
        bottom: point1.lat < point2.lat ? point1.lat : point2.lat,
        right: point1.lon > point2.lon ? point1.lon : point2.lon,
        left: point1.lon < point2.lon ? point1.lon : point2.lon,
    };
}

function isInBox(point, box) {
    return (
        point.lat <= box.top &&
        point.lat >= box.bottom &&
        point.lon <= box.right &&
        point.lon >= box.left
    );
}

function toDecimal(coords, ref) {
    let decimal_degrees = coords[0] + coords[1] / 60 + coords[2] / 3600;
    if (ref == "S" || ref == "W") {
        decimal_degrees = -decimal_degrees;
    }

    return decimal_degrees;
}

app.post("/uploadImage", function (req, res) {
    const { image } = req.files;

    if (!image) return res.sendStatus(400);
    if (imageExists(`${UPLOAD}${image.name}`)) {
        return res.sendStatus(400);
    }

    image.mv(UPLOAD + image.name);

    res.sendStatus(200);
});

app.get("/getImage", async function (req, res) {
    let imageName = req.query.image;
    let imagePath = `${UPLOAD}${imageName}`;

    try {
        if (!imageExists(imagePath)) {
            return res.sendStatus(404);
        }
    } catch (err) {
        console.error(err);
    }

    return res.sendFile(imagePath);
});

app.delete("/deleteImage", function (req, res) {
    let imageName = req.query.image;
    let imagePath = `${UPLOAD}${imageName}`;
    let thumbnailPath = `${UPLOAD}_${imageName}`;

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
});

app.get("/getThumbnail", async function (req, res) {
    let imageName = req.query.image;
    let imagePath = `${UPLOAD}${imageName}`;
    let thumbnailPath = `${UPLOAD}_${imageName}`;

    if (!imageExists(imagePath)) {
        return res.sendStatus(404);
    }

    if (imageExists(thumbnailPath)) {
        return res.sendFile(thumbnailPath);
    }

    await sharp(imagePath)
        .resize({ height: 256, width: 256 })
        .toFile(thumbnailPath)
        .catch(function (err) {
            console.log("Error occured: " + err);
        });

    res.sendFile(thumbnailPath);
});

app.get("/box", async function (req, res) {
    let point1 = { lat: req.query.lat1, lon: req.query.lon1 };
    let point2 = { lat: req.query.lat2, lon: req.query.lon2 };
    let box = getBox(point1, point2);

    let images = [];

    let files = fs.readdirSync(UPLOAD);

    for (let i = 0; i < files.length; i++) {
        let file = files[i];

        if (file.startsWith("_")) {
            continue;
        }

        let promise = await new Promise((resolve) => {
            new ExifImage({ image: `${UPLOAD}${file}` }, function (error, exifData) {
                if (error) {
                    console.log("Error: " + error.message);
                } else {
                    //tuka vsichko pochna da prilicha vse edno go e pisal jiv chovek
                    let gps = exifData.gps;

                    let point = {
                        lat: toDecimal(gps.GPSLatitude, gps.GPSLatitudeRef),
                        lon: toDecimal(gps.GPSLongitude, gps.GPSLongitudeRef)
                    };

                    resolve(isInBox(point, box));
                }
            });
        });

        if (promise == true) {
            images.push(file);
        }
    }

    res.send(images);
});

server.listen(port, () => {
    console.log("listening on *:3000");
});
