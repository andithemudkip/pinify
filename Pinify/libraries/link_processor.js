// String.prototype.splice = function(idx, rem, str) {
//     return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
// };
// function insert(str, index, value) {
//     return str.substr(0, index) + value + str.substr(index);
// }
String.prototype.insert = function(what, index) {
    // return index > 0
    //     ? this.replace(new RegExp('.{' + index + '}'), '$&' + what)
    //     : what + this;
    return this.substr(0, index) + what + this.substr(index);
};
function linkify(inputText) {
    var replacedText, replacePattern1, replacePattern2, replacePattern3;

    //URLs starting with http://, https://, or ftp://
    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

    //Change email addresses to mailto:: links.
    replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
    replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

    return replacedText;
}
function parseURL(url){ //https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
    parsed_url = {}

    if ( url == null || url.length == 0 )
        return parsed_url;

    protocol_i = url.indexOf('://');
    parsed_url.protocol = url.substr(0,protocol_i);

    remaining_url = url.substr(protocol_i + 3, url.length);
    domain_i = remaining_url.indexOf('/');
    domain_i = domain_i == -1 ? remaining_url.length - 1 : domain_i;
    parsed_url.domain = remaining_url.substr(0, domain_i);
    parsed_url.path = domain_i == -1 || domain_i + 1 == remaining_url.length ? null : remaining_url.substr(domain_i + 1, remaining_url.length);

    domain_parts = parsed_url.domain.split('.');
    switch ( domain_parts.length ){
        case 2:
          parsed_url.subdomain = null;
          parsed_url.host = domain_parts[0];
          parsed_url.tld = domain_parts[1];
          break;
        case 3:
          parsed_url.subdomain = domain_parts[0];
          parsed_url.host = domain_parts[1];
          parsed_url.tld = domain_parts[2];
          break;
        case 4:
          parsed_url.subdomain = domain_parts[0];
          parsed_url.host = domain_parts[1];
          parsed_url.tld = domain_parts[2] + '.' + domain_parts[3];
          break;
    }

    parsed_url.parent_domain = parsed_url.host + '.' + parsed_url.tld;

    return parsed_url;
}
function hasURLs(url){
    let link_re = /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/igm;
    let link_match = url.match(link_re);
    return link_match;
}
function ProcessPin(pin){
    let urls = hasURLs(pin.data);
    if(urls){
        if(pin.links && !$("#"+pin.id).children('.link').length){
            // console.log('update');
            if(!$("#"+pin.id).children('.links-wrapper').length){
                $("<div/>",{ class: "links-wrapper" }).insertBefore($("#"+pin.id).children('.pin-date-time'));
            }
            else{
                $("#"+pin.id).children('.links-wrapper').empty();
            }
            for(let i = 0; i < pin.links.length; i++){
                BuildPinURL(pin, pin.links[i].url, i, true); 
            }
        }
        else if(!pin.links && !$("#"+pin.id).children('.link').length){
            // console.log('new');
            pin.links = [];
            if(!$("#"+pin.id).children('.links-wrapper').length){
                $("<div/>",{ class: "links-wrapper" }).insertBefore($("#"+pin.id).children('.pin-date-time'));
            }
            else{
                $("#"+pin.id).children('.links-wrapper').empty();
            }
            for(let i = 0; i < urls.length; i++){
                pin.links.push({domain: parseURL(urls[i]).host, url: urls[i], data: {}});
                BuildPinURL(pin, urls[i], i);
            }
        }
    }

    let d = pin.data;
    let poschars = ['*', '_'];
    for(let i = 0; i < poschars.length; i++){
        d = FormatPin(d, 0, pin.data.length-1, poschars[i]);
    }
    d = linkify(d);
    $("#" + pin.id).children('.text, .pin').html(d);
    // if(localStorage.getItem('webshot-previews') == "true"){
    //     $("#" + pin.id).children('.text, .pin').children('a').each(function(){
    //         let s = userDataPath + '/webshots/' + $(this).attr('href').replace(/\//g,'-').replace(/:/g,'-').replace(/\./g, '-').replace(/\?/g,"-") + '.png';
    //         console.log(s);
    //         fs.readFile(s, 'utf8', (err, data)=>{
    //             if(err){
    //                 if(err.code == 'ENOENT'){
    //                     console.log(webshot);
    //                     webshot($(this).attr('href'), s, function(err){
    //                         delete pendingSnapshots[s];
    //                         console.log("snapshot saved");
    //                     });
    //                 }
    //             }
    //         });
    //     });
    // }
    
}
function FormatPin(data, i1, i2, ch){
    i1 = 0;
    i2 = data.length-1;
    let index1 = i1;
    let index2 = i2;
    let f = false;
    for(let i = i1; i < i2; i++){
        if(data[i] == ch){
            index1 = i;
            for(let j = i2; j > 0; j--){
                if(data[j] == ch && j != i){
                    index2 = j;
                    f = true;
                    break;
                }
            }
            if(f) {
                break
            }
        }
    }
    if(f) {
        data = data.slice(0, index1) + data.slice(index1+1, data.length);
        data = data.slice(0, index2-1) + data.slice(index2, data.length);
        let cinsert = '';
        let cinsertclose = '';
        switch(ch){
            case '*':
                cinsert = '<b>';
                cinsertclose = '</b>';
                break;
            case '_':
                cinsert = '<i>';
                cinsertclose = '</i>';
                break;
        }
        data = data.insert(cinsert, index1).insert(cinsertclose, index2 + cinsert.length-1);
        return FormatPin(data, index1, index2);
    }
    else{
        return data;
    }
}
function BuildPinURL(pin, url, index, update = false){
    switch(pin.links[index].domain){
        case "youtube":
            if(getYoutubeIdByUrl(url)){
                let vid_prev = $('<div/>',{class: "youtube-video-preview link link-hidden", id: url, style: "border-left: 4px solid rgb(240, 30, 40);"}).appendTo($("#"+pin.id).children('.links-wrapper'));
                if(!update){
                    $.post("http://andithemudkip.esy.es/Pinify/getVideoInfo.php",{id:getYoutubeIdByUrl(url)},(data)=>{
                        let obj = JSON.parse(data.toString());
                        let vid_title = $("<div/>", {class:"link-title", html: obj.title + "<br><i style = 'height: 20px;font-size: 14px; vertical-align: middle; line-height: 17px;' class = 'material-icons'>person</i> " + numberWithCommas(obj.viewcount) + " [YouTube]"}).appendTo(vid_prev);
                        $(vid_prev).append("<img height='48px' class = 'link-img' src = 'http://i.ytimg.com/vi/"+getYoutubeIdByUrl(url)+"/mqdefault.jpg'>");
                        pin.links[index].data = obj;
                    });
                }
                else{
                    let vid_title = $("<div/>", {class:"link-title", html: pin.links[index].data.title + "<br><i style = 'height: 20px;font-size: 14px; vertical-align: middle; line-height: 17px;' class = 'material-icons'>person</i> " + numberWithCommas(pin.links[index].data.viewcount) + " [YouTube]"}).appendTo(vid_prev);                
                    $(vid_prev).append("<img height='48px' class = 'link-img' src = 'http://i.ytimg.com/vi/"+getYoutubeIdByUrl(url)+"/mqdefault.jpg'>");
                }
            }
            else{
                CreateDefaultLink(url, pin);
            }
            break;
        case "prntscr":
            CreatePrntscrLink(url, pin);
            break;
        default:
            CreateDefaultLink(url, pin);
            break;
    }
}
function CreatePrntscrLink(url,pin){
    let def_link = $('<div/>',{
        class: "link prntscr-preview",
        id: url,
        style: "border-left: 4px solid rgb(6,69,173);"
    }).appendTo($("#"+pin.id).children('.links-wrapper'));
    metafetch.fetch(url, { 
        userAgent: "User Agent/Defaults to Firefox 58",
        flags: { 
            images: false,
            links: false,
            language: false
        },
        http: {
            timeout: 30000,
            headers: {
                Accept: "*/*"
            }
        }
    }, function(err, meta) {
        let link_img = $("<img/>",{
            style: 'margin-right: 5px;',
            class: 'prntscr-image',
            src: meta.image
        }).appendTo(def_link);
        if(meta.image == undefined){
            console.log('is undefined');
            $(link_img).attr('src', 'images/missing_site_favicon.png');
        }
        let link_title = $("<div/>", {
            class:"link-title",
            style: "display: inline;",
            html: "<br><b>" + meta.title + "</b><br><i>" + meta.description + "</i>"
        }).appendTo(def_link);
    });
}
function CreateDefaultLink(url,pin){
    let def_link = $('<div/>',{
        class: "link",
        id: url,
        style: "border-left: 4px solid rgb(6,69,173);"
    }).appendTo($("#"+pin.id).children('.links-wrapper'));
    metafetch.fetch(url, { 
        userAgent: "User Agent/Defaults to Firefox 58",
        flags: { 
            images: false,
            links: false,
            language: false
        },
        http: {
            timeout: 30000,
            headers: {
                Accept: "*/*"
            }
        }
    }, function(err, meta) {
        let link_img = $("<img/>",{
            style: 'float:left; margin-right: 5px;',
            class: 'link-image',
            src: meta.image
        }).appendTo(def_link);
        if(meta.image == undefined){
            // console.log('is undefined');
            $(link_img).attr('src', 'images/missing_site_favicon.png');
        }
        let n = typeof meta.siteName === "undefined" || !meta.siteName ? parseURL(url).host : meta.siteName; //when sitename is available, use it, otherwise use the url host
        let link_title = $("<div/>", {
            class:"link-title",
            style: "display: inline;",
            html: "<span style = 'font-size:11px;'>" + n  + "</span><br><b>" + meta.title + "</b><br><i>" + meta.description + "</i>"
        }).appendTo(def_link);
    });
}