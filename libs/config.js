const tools = {
    //https://manual.calibre-ebook.com/generated/en/ebook-convert.html
    ebook: '..\\applications\\calibre_portable\\Calibre\\ebook-convert.exe',
    ebookIn: ['*'],
    ebookOut: ['azw3', 'docx', 'epub', 'mobi', 'pdf', 'txt', 'fb2', 'pmlz', 'htmlz', 'lit', 'lrf', 'pdb', 'rb', 'rtf', 'snb', 'tcr', 'txtz'],
    ebookTimeMin: 10,
    //https://www.imagemagick.org/script/command-line-processing.php
    images: '..\\applications\\ImageMagick\\magick.exe',
    imagesIn: '*',
    imagesOut: ['png', 'jpg', 'jpeg', 'ico', 'svg', 'bmp', 'gif', 'psd', 'pdf', 'cur', 'tiff', 'hdr', 'tga', 'webp', 'rgba', 'ppm', 'rgb', 'pgm', 'xpm', 'jp2', 'pnm', 'xbm', 'pcx', 'pbm', 'pcd', 'pct', 'picon', 'map', 'yuv', 'pict', 'g3', 'fts', 'hrz', 'fax', 'pdb', 'exr', 'uyvy', 'wbmp', 'sgi', 'rgbo', 'pal', 'viff', 'otb', 'pam', 'ipl', 'mng', 'mtv', 'palm', 'pfm', 'ras', 'xv', 'sun'],
    imagesTimeMin: 10,
    //http://ffmpeg.org/documentation.html
    audio: '..\\applications\\ffmpeg\\bin\\ffmpeg.exe',
    audioIn: '*',
    audioOut: ['aac','ac3','mp3', 'aiff','au','caf','flac','ircam','m4a','ogg','opus','tta','voc','vox','w64','wav','wma','wv'],
    audioTODO: ['8svx', 'amb','amr','avr','cdda','cvs','cvsd','cvu','dts','dvms','fap','fssd','gsm','gsrt','hcom','htk','ima','maud','nist','paf','prc','pvf','sln','smp','snd','sndr','sndt','sou','sph','spx','txw','vms','wve'],
    audioTimeMin: 10,
    //http://ffmpeg.org/documentation.html
    video: '..\\applications\\ffmpeg\\bin\\ffmpeg.exe',
    videoIn: '*',
    videoOut: ['avi', 'mp4','wmv','mpeg','mov','gif', 'swf','mpg','flv','vob','ogv','webm','mkv','asf','m4v','ts','f4v','m2ts','mts','m2v','wtv','hevc','rm'],
    videoTODO: ['divx','3gp','xvid','mpeg-2','rmvb','mxf','avchd','3g2',],
    videoTimeMin: 10,
    //
    document: '..\\applications\\LibreOfficePortable\\LibreOfficePortable.exe',
    documentIn: '*',
    documentOut: ['doc','docm','docx','dot','html','odt','pdf','rtf','txt','wps', 'png', 'jpg'],
    documentTODO: ['abw', 'aw', 'csv', 'djvu', 'dbk', 'dotm', 'dotx', 'kwd','oxps','sxw','xls','xlsx','xps'],
    documentTimeMin: 10
}

module.exports.tools = tools;