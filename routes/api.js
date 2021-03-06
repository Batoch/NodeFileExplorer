const basedir = process.env.FOLDER || "share";
const maxdepth = process.env.MAXFOLDER || 100;
const fs = require('fs');
const sanitize = require("sanitize-filename");

function api(req, res) {
  const requestdir = req.body.dir;

  var dir = "";
  for (let index = 0; index < (requestdir.length < maxdepth ? requestdir.length : maxdepth); index++) {
    dir = dir + "/" + sanitize(requestdir[index]);
  }

  var jsonfiles = {"listfiles": []};
  new Promise((resolve, reject) => {
    return fs.readdir(basedir + "/" + dir, (err, filenames) => err != null ? reject(err) : resolve(filenames))
  }).then((filenames) => {
    filenames.forEach(file => {
      jsonfiles.listfiles.push({
        "name" : file,
        "url"  : (dir=="" ? "" : (dir + "/")) + file,
        "file" : fs.lstatSync(basedir + "/" + (dir=="" ? "" : (dir + "/")) + file).isFile(),
        "type" : type(file)
        })
    })
    res.status(200).json(jsonfiles)
  }).catch((error) => {
    console.error(error);
    res.status(423).send({
      message: "Error accessing the folder.",
    });
  })
};

function type(filename){
  var parts = filename.split('.');
  var extension = parts[parts.length - 1];

  switch (extension.toLowerCase()) {
    case 'm4v':
    case 'avi':
    case 'mpg':
    case 'mp4':
    case 'mkv':     // mkv work only with chrome
      return "video";
  }
  switch (extension.toLowerCase()) {
    case 'jpg':
    case 'gif':
    case 'bmp':
    case 'png':
      return "image";
  }
  return "other"
}

module.exports = api;
