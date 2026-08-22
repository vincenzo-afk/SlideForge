/**
 * SlideForge — Export
 * 1) PDF: re-renders the full deck into a print view and invokes the
 *    browser's print dialog (styled with @page / print CSS).
 * 2) PPTX: hand-rolled OOXML generator (XML + ZIP) with zero libraries.
 */
var SlideForgeExport = (function () {
  "use strict";

  function escXml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  /* ---------- PDF (print) ---------- */
  function printPDF() {
    var deck = SlideForgeSlides.getDeck();
    if (!deck) return;
    var w = window.open("", "_blank", "width=1000,height=800");
    if (!w) { alert("Please allow popups to export PDF."); return; }
    var accent = deck.theme.accent, fg = deck.theme.fg, bg = deck.theme.bg;
    var hf = deck.theme.headingFont, bf = deck.theme.bodyFont;
    var slidesHtml = deck.slides.map(function (s) {
      return '<div class="p-slide">' +
        '<h1>' + escXml(s.title) + "</h1>" +
        (s.content.length ? '<ul>' + s.content.map(function (c) { return "<li>" + escXml(c) + "</li>"; }).join("") + "</ul>" : "") +
        (s.notes ? '<p class="p-notes">' + escXml(s.notes) + "</p>" : "") +
        "</div>";
    }).join("");
    w.document.write("<!DOCTYPE html><html><head><meta charset='utf-8'><title>" +
      escXml(deck.topic || deck.theme.name) + " — SlideForge</title>" +
      "<style>" +
      "@page{size:1280px 720px;margin:0;}" +
      "body{margin:0;font-family:" + bf + ";color:" + fg + ";background:" + bg + ";}" +
      ".p-slide{width:1280px;height:720px;page-break-after:always;display:flex;flex-direction:column;justify-content:center;padding:70px 90px;box-sizing:border-box;background:" + deck.theme.gradient + ";}" +
      ".p-slide:last-child{page-break-after:auto;}" +
      "h1{font-family:" + hf + ";font-size:54px;margin:0 0 28px;color:" + fg + ";}" +
      "ul{font-size:28px;line-height:1.6;margin:0;padding-left:44px;}" +
      "li{margin-bottom:16px;}" +
      ".p-notes{margin-top:auto;font-size:16px;opacity:.7;font-style:italic;}" +
      "@media print{.p-slide{break-after:page;}}" +
      "</style></head><body>" + slidesHtml +
      "<script>setTimeout(function(){window.print();},600);<\/script>" +
      "</body></html>");
    w.document.close();
  }

  /* ---------- PPTX (OOXML) ---------- */
  var PPTX_CONTENT_TYPES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation+xml"/>' +
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    '%SLIDES%</Types>';

  var PPTX_PRESENTATION =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveUnderline="1">' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:sldIdLst>%SLIDEIDS%</p:sldIdLst>' +
    '<p:sldSz cx="9144000" cy="5143500"/>' +
    "</p:presentation>";

  var PPTX_SLIDE =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    "%BODY%" +
    "</p:spTree></p:cSld></p:sld>";

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }
  function rgbInt(hex) {
    var c = hexToRgb(hex);
    return (c.r << 16) | (c.g << 8) | c.b;
  }

  function textShape(id, x, y, cx, cy, text, sizePt, bold, color, align) {
    var lines = text.split("\n").map(function (l) {
      return '<a:p><a:pPr algn="' + align + '"/><a:r><a:rPr lang="en-US" sz="' + (sizePt * 100) +
        '" b="' + (bold ? "1" : "0") + '" solidFill=""><a:srgbClr val="' + color.replace("#", "") +
        '"/></a:srgbFill><a:latin typeface="Calibri"/></a:rPr><a:t>' + escXml(l) + "</a:t></a:r></a:p>";
    }).join("");
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name=""/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
      '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>' +
      '<p:txBody><a:bodyPr wrap="square" anchor="ctr"/><a:lstStyle/><a:p>' + lines + "</a:p></p:txBody></p:sp>";
  }

  function buildSlideXml(slide, i, total, accent) {
    var accentClr = accent.replace("#", "");
    var titleSize = (i === 0 || i === total - 1) ? 30 : 20;
    var body = "";
    var idc = 2;
    // title
    body += textShape(idc++, 457200, 228600, 8229600, 914400, slide.title, titleSize, true, accentClr, "ctr");
    if (i === 0) {
      if (slide.content[0]) body += textShape(idc++, 1371600, 2286000, 6400800, 914400, slide.content[0], 16, false, "404040", "ctr");
      if (slide.content[1]) body += textShape(idc++, 1371600, 2971800, 6400800, 685800, slide.content[1], 12, false, "808080", "ctr");
    } else if (i === total - 1) {
      if (slide.content[0]) body += textShape(idc++, 1371600, 2286000, 6400800, 914400, slide.content[0], 16, false, "404040", "ctr");
      if (slide.content[1]) body += textShape(idc++, 1371600, 2971800, 6400800, 914400, slide.content[1], 12, false, "808080", "ctr");
    } else {
      var y = 1371600;
      slide.content.forEach(function (c) {
        body += textShape(idc++, 914400, y, 7315200, 685800, "\u2022  " + c, 14, false, "404040", "l");
        y += 685800;
      });
    }
    return PPTX_SLIDE.replace("%BODY%", body);
  }

  /* Minimal ZIP writer (store, no compression) with CRC-32. */
  function crc32(buf) {
    var table = crc32.table || (crc32.table = (function () {
      var t = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
      }
      return t;
    })());
    var c = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function strToBytes(str) {
    var enc = new TextEncoder();
    return enc.encode(str);
  }

  function buildZip(entries) {
    var parts = [];
    var central = [];
    var offset = 0;
    entries.forEach(function (e) {
      var nameBytes = strToBytes(e.name);
      var local = new Uint8Array(30 + nameBytes.length + e.data.length);
      var dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);            // version
      dv.setUint16(6, 0, true);             // flags
      dv.setUint16(8, 0, true);             // method = store
      dv.setUint16(10, 0, true);            // mod time
      dv.setUint16(12, 0, true);            // mod date
      dv.setUint32(14, e.crc, true);
      dv.setUint32(18, e.data.length, true);
      dv.setUint32(22, e.data.length, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      local.set(e.data, 30 + nameBytes.length);
      parts.push(local);

      var ch = new Uint8Array(46 + nameBytes.length);
      var dv2 = new DataView(ch.buffer);
      // Central directory header layout (ZIP spec):
      //  0 sig(4) 4 verMade(2) 6 ver(2) 8 flags(2) 10 method(2) 12 mtime(2)
      // 14 mdate(2) 16 crc(4) 20 compSize(4) 24 uncompSize(4) 28 nameLen(2)
      // 30 extraLen(2) 32 commentLen(2) 34 diskStart(2) 36 intAttr(2)
      // 38 extAttr(4) 42 localOffset(4) 46 name
      dv2.setUint32(0, 0x02014b50, true);
      dv2.setUint16(4, 20, true);
      dv2.setUint16(6, 20, true);
      dv2.setUint16(8, 0, true);
      dv2.setUint16(10, 0, true);
      dv2.setUint16(12, 0, true);
      dv2.setUint16(14, 0, true);
      dv2.setUint32(16, e.crc, true);
      dv2.setUint32(20, e.data.length, true);
      dv2.setUint32(24, e.data.length, true);
      dv2.setUint16(28, nameBytes.length, true);
      dv2.setUint16(30, 0, true);
      dv2.setUint16(32, 0, true);
      dv2.setUint16(34, 0, true);
      dv2.setUint16(36, 0, true);
      dv2.setUint32(38, 0, true);
      dv2.setUint32(42, offset, true);
      ch.set(nameBytes, 46);
      central.push(ch);
      offset += local.length;
    });
    var centralLen = central.reduce(function (s, c) { return s + c.length; }, 0);
    var totalLen = offset + centralLen + 22;
    var out = new Uint8Array(totalLen);
    var pos = 0;
    parts.forEach(function (p) { out.set(p, pos); pos += p.length; });
    central.forEach(function (c) { out.set(c, pos); pos += c.length; });
    var dv = new DataView(out.buffer, pos);
    // End of central directory record (ZIP spec):
    //  0 sig(4) 4 diskNum(2) 6 cdDiskNum(2) 8 cdEntriesDisk(2) 10 cdEntries(2)
    // 12 cdSize(4) 16 cdOffset(4) 20 commentLen(2)
    dv.setUint32(0, 0x06054b50, true);
    dv.setUint16(4, 0, true);
    dv.setUint16(6, 0, true);
    dv.setUint16(8, entries.length, true);
    dv.setUint16(10, entries.length, true);
    dv.setUint32(12, centralLen, true);
    dv.setUint32(16, offset, true);
    dv.setUint16(20, 0, true);
    return out;
  }

  function downloadPPTX() {
    var deck = SlideForgeSlides.getDeck();
    if (!deck) return;
    var entries = [];
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
      "</Relationships>";
    entries.push({ name: "_rels/.rels", data: strToBytes(rels), crc: crc32(strToBytes(rels)) });

    var overrideTypes = deck.slides.map(function (_, i) {
      return '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
    }).join("");
    var ct = PPTX_CONTENT_TYPES.replace("%SLIDES%", overrideTypes);
    entries.push({ name: "[Content_Types].xml", data: strToBytes(ct), crc: crc32(strToBytes(ct)) });

    var theme = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="SlideForge">' +
      '<a:themeElements><a:clrScheme name="SlideForge">' +
      '<a:dk1><a:srgbClr val="FFFFFF"/></a:dk1><a:lt1><a:srgbClr val="000000"/></a:lt1>' +
      '<a:dk2><a:srgbClr val="1F1F1F"/></a:dk2><a:lt2><a:srgbClr val="E8E8E8"/></a:lt2>' +
      '<a:accent1><a:srgbClr val="' + deck.theme.accent.replace("#", "") + '"/></a:accent1>' +
      '<a:accent2><a:srgbClr val="4472C4"/></a:accent2><a:accent3><a:srgbClr val="ED7D31"/></a:accent3>' +
      '<a:accent4><a:srgbClr val="A5A5A5"/></a:accent4><a:accent5><a:srgbClr val="FFC000"/></a:accent5>' +
      '<a:accent6><a:srgbClr val="5B9BD5"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink>' +
      '<a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>' +
      '<a:fontScheme name="SlideForge"><a:majorFont><a:latin typeface="Calibri"/></a:majorFont>' +
      '<a:minorFont><a:latin typeface="Calibri"/></a:minorFont></a:fontScheme>' +
      '<a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
      '<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>' +
      '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
      '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>' +
      "</a:fmtScheme></a:themeElements></a:theme>";
    entries.push({ name: "ppt/theme/theme1.xml", data: strToBytes(theme), crc: crc32(strToBytes(theme)) });

    var slideRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
      "</Relationships>";
    var slideIds = "";
    deck.slides.forEach(function (s, i) {
      var xml = buildSlideXml(s, i, deck.slides.length, deck.theme.accent);
      entries.push({ name: "ppt/slides/slide" + (i + 1) + ".xml", data: strToBytes(xml), crc: crc32(strToBytes(xml)) });
      entries.push({ name: "ppt/slides/_rels/slide" + (i + 1) + ".xml.rels", data: strToBytes(slideRels), crc: crc32(strToBytes(slideRels)) });
      slideIds += '<p:sldId id="' + (255 + i) + '" r:id="rId' + (i + 1) + '"/>';
    });

    var pres = PPTX_PRESENTATION.replace("%SLIDEIDS%", slideIds);
    var presRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' +
      deck.slides.map(function (_, i) {
        return '<Relationship Id="rId' + (i + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + (i + 1) + '.xml"/>';
      }).join("") +
      deck.slides.map(function (_, i) {
        return '<Relationship Id="rId' + (deck.slides.length + i + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="slideLayouts/slideLayout1.xml"/>';
      }).join("") +
      "</Relationships>";
    entries.push({ name: "ppt/presentation.xml", data: strToBytes(pres), crc: crc32(strToBytes(pres)) });
    entries.push({ name: "ppt/_rels/presentation.xml.rels", data: strToBytes(presRels), crc: crc32(strToBytes(presRels)) });

    var master = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
      '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
      '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>' +
      '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
      '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
      "</p:sldMaster>";
    entries.push({ name: "ppt/slideMasters/slideMaster1.xml", data: strToBytes(master), crc: crc32(strToBytes(master)) });

    var masterRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
      "</Relationships>";
    entries.push({ name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", data: strToBytes(masterRels), crc: crc32(strToBytes(masterRels)) });

    var layout = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">' +
      '<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
      '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>' +
      "</p:sldLayout>";
    entries.push({ name: "ppt/slideLayouts/slideLayout1.xml", data: strToBytes(layout), crc: crc32(strToBytes(layout)) });

    var zip = buildZip(entries);
    var blob = new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = (deck.topic || "slideforge-deck").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60) + ".pptx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { printPDF: printPDF, downloadPPTX: downloadPPTX };
})();
