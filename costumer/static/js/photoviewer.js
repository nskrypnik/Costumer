if ( !Function.prototype.bind ) {

		Function.prototype.bind = function( obj ) {
			var slice = [].slice,
			args = slice.call(arguments, 1),
			self = this,
			nop = function () {},
			bound = function () {
				return self.apply( nop.prototype && this instanceof nop ? this : ( obj || {} ),
					args.concat( slice.call(arguments) ) );
			};

		nop.prototype = self.prototype;

		bound.prototype = new nop();

		return bound;
	};
}

if (typeof(console) == 'undefined'){
    console = {
        log: function(){}
    }
}


function AbstractViewer() {
	this.settings = {
	};

	this.get_scope = function (el) {
		return $(el).closest('ul.images')
	};

	this.load_all_slides = function(scope) {
		// load elements to slide list
	};


	this.on_show = function(el) {
		// show current slide
	};


	this.after_init = function(el) {
	};

	this.init = function (el) {
		
		this.viewerEl = $('#photo-view');
		this.photoEl = $('#photo-view .photos-wrapper .photo-slides');
		this.preViewerEl = $('#photo-view .small-icons-previewer')
		this.captionEl = $('.photo-viewer-title-wrapper')
		this.captionEl.find('a.photo-edit-link').hide();
		this.commentsEl = $('#photo-view .comment-list');
		//copy to photoarea
		if (el == null)
			return;
		this.photoEl.html('');
		
		this.load_all_slides(el);
		
		this.slide_count = $('.photo', this.photoEl).size();
		
		if (this.slide_count > 1) {
			$('.photo-scroll-right', this.viewerEl).show();
			$('.photo-scroll-left', this.viewerEl).show();
		} else {
			$('.photo-scroll-right', this.viewerEl).hide();
			$('.photo-scroll-left', this.viewerEl).hide();
		}
		
		var self = this;
		//unbind old listeners
		$([
			this.commentsEl.parent().find('.post-reply-new div.button'),
			this.viewerEl.find('.photo-scroll-right'),
			this.viewerEl.find('.photo-scroll-left'),
			this.viewerEl.find('.photo-slides'),
			this.viewerEl.find('.photo'),
			this.viewerEl.find('a.close'),
			this.commentsEl.parent().find('.post-reply-new div.button'),
		]).each (function (k, v) {
		    if(typeof(v) != 'undefined'){
			    v.off('click');
			}
		})
		//bind listeners
		this.viewerEl.find('.photo-scroll-left').click((function () {
			self.prev();
			return false;
		}))
		this.viewerEl.find('.photo-scroll-right').click((function () {
			self.next();
			return false;
		}))
//		this.viewerEl.find('.photo-slides').click((function () {
//			self.close();
//			return false;
//		}))
		this.viewerEl.find('.post-comment-link').click(function () {
			$(this).hide();
			self.viewerEl.find('.post-reply-new').show();
			return false;
		});
		
		this.viewerEl.find('a.close').click((function () {
			this.close();
			return false;
		}).bind(this));
		
		this.commentsEl.parent().parent().find('.post-reply-new .button').click(function () {
			var text = $(this).parent().find('textarea').val();
			$(this).parent().find('textarea').val('');
			var id  = self.photoEl.find('.photo.active').attr('media_id');
			// console.log("cliked post", id, text);
			self.sendComment(id, text);
			self.viewerEl.find('.post-comment-link').show();
			self.viewerEl.find('.post-reply-new').hide();
			return false;
		});
		this.after_init(el);
	};

	this.show = function (el) {
		if (this.opened || false) {
			// console.log("already opened", this.opened);
			return false;
		}
		this.opened = true;
		// console.log("opening viewer", this.opened);
		//init viewer on scope of photos around current one
		var scope = this.get_scope(el);
		// console.log("scope", scope);
		this.init(scope);
		var id = $(el).closest('*[media_id]').attr('media_id');
		// console.log(id);
		var current_photo = this.photoEl.find('.photo[media_id="'+id+'"]');
		
		this.on_show(current_photo)
		// console.log(current_photo);
		this.photoEl.find('.photo.active')
			.removeClass('active').hide();
		this.photoEl.find('.photo.last-active')
			.removeClass('last-active').hide();
		current_photo.addClass('active').show();
		
		this.highlighThumb(id);
		
		this.captionEl.show()
		
		//this.loadComments(current_photo);
		$("#photo-view").css({opacity: 0.0}).
			animate({opacity: 1.0}, 500, null).toggle(true);
		$('body').addClass('photo-viewer-active');
	};

	this.close = function () {
		if (this.closing || false) {
			return false;
		}
		this.closing = true;

		this.photoEl.find('.photo.active')
			.removeClass('active');
		this.photoEl.find('.photo.last-active')
			.removeClass('last-active');
		
		this.captionEl.hide()

		var self = this;
		$("#photo-view").css({opacity: 1.0}).
			animate({opacity: 0.0}, 500, function () {
				// $(this).toggle(false);
				$(this).addClass('hidden');
				self.opened = false;
				self.closing = false;
				// console.log("closing viewer", self.opened);
				$(this).hide();
				// console.log(this);
			});
		$('body').removeClass('photo-viewer-active');
	};

	this.next = function () {
		var active = this.photoEl.find('.photo.active');
		this.photoEl.find('.last-active').removeClass('last-active');
		active.addClass('last-active');

		if ( active.length == 0 )
			active = this.photoEl.find('.photo').first();
		var next =  active.next().length ? active.next()
			: this.photoEl.find('.photo').first();
		this.on_show(next)
		//this.loadComments(next);

		// //todo delete after fade effect released 
		next.addClass('active').show();
		active.removeClass('active').hide()
		
		this.highlighThumb(next.attr('media_id'));

		// //TODO fade effect
		// active.animate({opacity: 0.0}, 500, function() {
		// 	});
		// next.css({opacity: 0.0})
		// 	.addClass('active')
		// 	.animate({opacity: 1.0}, 500, function() {
		// 		active.removeClass('active last-active').hide();
		// 	});
	};

	this.prev = function () {
		var active = this.photoEl.find('.photo.active');
		this.photoEl.find('.last-active').removeClass('last-active');
		active.addClass('last-active');

		if ( active.length == 0 ) 
			active = this.photoEl.find('.photo').last();
		var prev =  active.prev().length ? active.prev()
			: this.photoEl.find('.photo').last();
		this.on_show(prev)
		//this.loadComments(prev);

		// //TODO delete after fade effect released 
		prev.addClass('active').show();
		active.removeClass('active').hide();
		
		this.highlighThumb(prev.attr('media_id'));
	};

	this.loadComments =  function (el) {
	};

	this.sendComment = function (id, text) {
	};
	
	this.resetReplyBox = function(){
		$('.post-comment-link').show();
		$('.post-reply-new').hide();
	}
	
	this.highlighThumb = function(media_id){
	    var current_thumb = this.preViewerEl.find('img[media_id="'+media_id+'"]');
		this.preViewerEl.find('img.active').removeClass('active');
		current_thumb.addClass('active');
		k = parseInt(current_thumb.attr('index'));
		
		// Then animate small-icons-previewer
		var previewer_position = $(window).width()/2 - (k + 1)*75;
		console.log(previewer_position);
		//$('.small-icons-previewer').css({'left': previewer_position + 'px'});
		$('.small-icons-previewer').animate({'left': previewer_position + 'px'}, 200);
	}
}

function PhotoViewer() {
	this.settings = {
		preloadAmount: 2
	};

	this.load_all_slides = function(scope) {
		//load elements to slide list
		var photoEl = this.photoEl
		var preViewerEl = this.preViewerEl;
		var self = this;
		preViewerEl.html('');
		$(scope).find(".photo a").each(function(k, el) {
			var href = $(el).attr('href');
			// var id = $(el).parents('div.photo-wrapper.photo').attr('photo_id') 
			var id = $(el).parents('.photo').attr('media_id');
			console.log(id);
			var img = $("<img />")
				.attr({"href": href, "media_id": id}).addClass('photo');
				
			photoEl.append(img);
			
			var thumb_src = $(el).find('.viewer-thumb').text()
			var thumb_link = $("<a />").attr({href: '#'})
			var thumb = $("<img />").attr({"src": thumb_src, "media_id": id, "index": k});
			thumb_link.append(thumb)
			preViewerEl.append(thumb_link);
			
			thumb_link.click(function(){
			    var current = photoEl.find('.photo.active');
			    
		        photoEl.find('.last-active').removeClass('last-active');
		        var chosen_id = $(this).find('img').attr('media_id');
		        var chosen_photo = photoEl.find('.photo[media_id="'+id+'"]');
		        if (current != chosen_photo){
    			    current.removeClass('active');
    			    current.hide();
    			    var src = chosen_photo.attr('href')
    			    chosen_photo.attr({src:src})
		            chosen_photo.addClass('active');
		            chosen_photo.show();
		        }
		        else console.log('The same photo as viewed');
		        
		        self.highlighThumb(chosen_photo.attr('media_id'))
		        return false;
			})
		});
	},

	this.after_init = function(el) {
		var self = this;
		this.viewerEl.find('.photo').off('click');
		if (this.slide_count > 1) {
			this.viewerEl.find('.photo').click(function () {
				self.next();
				return false;
			})
		}
		// Bind photo edit link
		this.viewerEl.find('a.photo-edit-link').click(function(){
				$(this).hide();
				self.viewerEl.find('.photo-title').hide()
				self.viewerEl.find('.photo-edit-fields').show();
		})
		
		this.captionEl.find('button.change-photo-caption').click(function(){
				photo_id = self.captionEl.find('input[name=photo_id]').val()
				caption = self.captionEl.find('input[name=title]').val()
				jsonrpc('/photo/api/', 'change_photo_caption', [photo_id, caption]);
				self.captionEl.find('.photo-title').text(caption);
				self.captionEl.find('.photo-edit-fields').hide();
				self.captionEl.find('.photo-title').show();
				self.captionEl.find('a.photo-edit-link').show();
		})

		
		this.resize(window);
		$(window).resize(function () {
			self.resize(window);
		});
	};

	this.on_show = function(el) {
		$(el).attr({'src': $(el).attr('href')});
		this.preload(el);
	};

	this.preload = function (el) {
		var next = $(el);
		var prev = $(el);
		for (var i=0; i < this.settings.preloadAmount; i++) {
			next = next.next().length ? next.next() : next;
			prev = prev.prev().length ? prev.prev() : prev;
			next.attr({'src': next.attr('href')});
			prev.attr({'src': prev.attr('href')});
		}
	};

	this.resize = function(wnd){
		var window_height = wnd.innerHeight
		var window_width = wnd.innerWidth
		var min_window_height = 200
		var min_window_width = 800
		if (window_height >= min_window_height &&
			window_width >= min_window_width) {
//			console.log(wnd.innerHeight, wnd.innerWidth);
			this.photoEl.find('img.photo').each(function(k, el){
				$(el).css({
					'max-height': window_height - 105,
					'max-width': window_width - 450,
					});
			});
		}
	};

	this.loadComments =  function (el) {
		var photo_id = $(el).attr('media_id');
		var comments_html;
		var self = this;
		// console.log("loading comments", photo_id);
		this.resetReplyBox();
		jsonrpc('/photo/api/', 'get_all_comments', [photo_id], function (data){
			data = data.result;
			self.commentsEl.html(data.comments);
			self.captionEl.find('.photo-title').text(data.caption); // Show photo caption
			self.captionEl.find('input[name=photo_id]').val(photo_id); // Write hidden photo_id value
			self.captionEl.find('input[name=title]').val(data.caption);
			self.viewerEl.find('.post-age').text(data.date);
			if (data.editable){
				self.captionEl.find('a.photo-edit-link').show();
			}
			else{
				self.captionEl.find('a.photo-edit-link').hide();
			}
			self.captionEl.find('.photo-edit-fields').hide();
			self.captionEl.find('.photo-title').show();
			
			self.viewerEl.find('div.post-author').html(data.owner.name);
			self.viewerEl.find('a.post-avatar img').attr({src: data.owner.avatar});
			
			
		})
	};

	this.sendComment = function (id, text) {
		var self = this;
		jsonrpc('/photo/api/', 'add_comment_to_photo', [id, text], function (data){
			// console.log("comment sent", data);
			self.commentsEl.append(data.result.comment);
		})
	};
}

PhotoViewer.prototype = new AbstractViewer();

photoViewer = new  PhotoViewer()


