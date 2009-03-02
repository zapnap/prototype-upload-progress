/*
 * prototype.uploadProgress
 *
 * Copyright (c) 2008 Peter Sarnacki (drogomir.com)
 * Modified by Nick Plante, 2009 (blog.zerosum.org)
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 */
var UploadProgressMethods = {
  uploadProgress: function(element, options) {
    options == options || {};
    options = Object.extend({
      client_interval: 500,
      interval: 10000,
      progressContainer: "progress",
      progressBar: "progressbar",
      progressUrl: "/progress",
      previous_percent: 0,
      previous_time: 0,
      current_percent: 0,
      rate: 0,
      start: function() {},
      uploading: function() {},
      complete: function() {},
      success: function() {},
      error: function() {},
      server_timer: "",
      client_timer: "",
    }, options);
    
    Event.observe(element, 'submit', function(ev) {
      /* safari can't get scripts properly while submitting files because it's braindead */
      if (Prototype.Browser.WebKit) {
        $(options.progressContainer).show();
        setInterval(function() { 
          options.current_percent = options.current_percent + 10;
          if (options.current_percent > 100) options.current_percent = 0;
          $(options.progressBar).setStyle({width: options.current_percent + '%'});
        }, options.client_interval);
      } else {
        var uuid = "";
        for (i = 0; i < 32; i++) { uuid += Math.floor(Math.random() * 16).toString(16); }
      
        options.uuid = uuid;
        /* start callback */
        options.start();
      
        /* patch the form-action tag to include the progress-id 
           if X-Progress-ID has been already added just replace it */
        if (old_id = /X-Progress-ID=([^&]+)/.exec($(this).readAttribute("action"))) {
          var action = $(this).readAttribute("action").replace(old_id[1], uuid);
          $(this).writeAttribute("action", action);
        } else {
          $(this).writeAttribute("action", $(this).readAttribute("action") + "?X-Progress-ID=" + uuid);
        }
        var uploadProgress = Prototype.uploadProgress;
        var uploadMovement = Prototype.uploadMovement;
        options.server_timer = window.setInterval(function() { uploadProgress(this, options) }, options.interval);
        options.client_timer = window.setInterval(function() { uploadMovement(this, options) }, options.client_interval);
      }
    });
  }
};
 
Element.addMethods(UploadProgressMethods);
 
PrototypeUploadProgressMethods = {
  uploadMovement: function(element, options) {
    if (options.current_percent >= 100) {
      window.clearTimeout(options.client_timer);
    } else {
      $(options.progressContainer).show();

      options.current_percent = options.current_percent + options.rate
      if (options.current_percent > 100) options.current_percent = 100;
      $(options.progressBar).setStyle({width: Math.floor(options.current_percent) + '%'});
    }
  },
      
  uploadProgress: function(element, options) {
    new Ajax.Request(options.progressUrl, {
      method: 'get',
      parameters: 'X-Progress-ID='+ options.uuid,
      onSuccess: function(xhr) {
        var upload = xhr.responseText.evalJSON();
        var current_time = new Date();
        var miliseconds = current_time.getTime();
        upload.percents = Math.floor((upload.received / upload.size)*100);
        if (upload.state == 'uploading') {
          if (((miliseconds - options.previous_time !=0)) && ((100 - upload.percents) !=0)) {
            options.rate = (upload.percents - options.previous_percent) * options.client_interval / (miliseconds - options.previous_time) * ( (100-options.current_percent) / (100 - upload.percents) );
            options.previous_time = miliseconds;
            options.previous_percent = upload.percents;
          }
        }
        /* we are done, stop the interval */
        else if (upload.state == 'done' || upload.state == 'error') {
          window.clearTimeout(options.server_timer);
          options.complete(upload);
        }
        
        else if (upload.state == 'done') {
          options.success(upload);
        }
        
        else if (upload.state == 'error') {
          options.error(upload);
        }
      }
    });
  }
};
 
Object.extend(Prototype, PrototypeUploadProgressMethods);
