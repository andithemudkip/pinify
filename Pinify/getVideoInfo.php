<?php
    header('Access-Control-Allow-Origin: *');
    $api_key = 'AIzaSyASsh66aN3SEnPio3UIlmqA2agnOcC108M';
  
    $video_id = $_POST['id'];
    // echo $video_id;
    
    $api_url = 'https://www.googleapis.com/youtube/v3/videos?part=snippet%2Cstatistics&id=' . $video_id . '&key=' . $api_key;
        
    $data = json_decode(file_get_contents($api_url));
    // print_r($data);
    // echo file_get_contents($api_url);
    // $vars = new StdClass();
    // $vars->tedi = "bear";
    $d = new StdClass();
    $d->title = $data->items[0]->snippet->title;
    $d->thumbnail_s = $data->items[0]->snippet->thumbnails->default->url; //120x90
    $d->thumbnail_m = $data->items[0]->snippet->thumbnails->high->url; //480x360
    //fix this // $d->thumbnail_l = $data->items[0]->snippet->thumbnails->maxres->url; //1280x720
    $d->viewcount = $data->items[0]->statistics->viewCount;
    // print_r($d);
    echo json_encode($d)
    


?>