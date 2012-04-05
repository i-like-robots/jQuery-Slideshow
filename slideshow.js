/**
 * @name        Slides
 * @author      Matt Hinchliffe <http://www.maketea.co.uk>
 * @modified    04/04/2012
 * @version     0.9.7
 * @description Simple slideshow
 * @example
 * <div class="slideshow">
 *     <ul class="slides">
 *         <li class="slide"><a href="#">Option 1</a></li>
 *         <li class="slide"><a href="#">Option 2</a></li>
 *     </ul>
 * </div>
 *
 * @example
 * var slideshow = $('.slideshow').slides(opts).data('slides');
 */

/*jshint trailing:true, smarttabs:true */
; (function($, undefined)
{
	"use strict";

	var defaults = {
		auto: 6000,               // Autoplay timeout in milliseconds. Set to false for no autoplay.
		speed: 600,               // Animation speed between slides in milliseconds.
		easing: 'swing',          // Animation easing for single transition
		easeIn: 'swing',          // Animation easing on fade in.
		easeOut: 'swing',         // Animation easing on fade out.
		pagination: true,         // Display pagination.
		skip: true,               // Display next/previous skip buttons.
		queue: false,             // Allow .to() method while animations are queued.
		loop: false,              // Allow slideshow to loop.
		transition: 'scroll',     // Specify transition.
		gestures: true,           // Allow swipe events to control previous/next.
		onupdate: undefined       // A callback function to execute on update event.
	};

	var Slides = function($target, options)
	{
		this.opts = $.extend({}, defaults, options);
		this.target = $target[0];
		this.$slideshow = $target;

		this._init();

		return this;
	};

	Slides.prototype = {

		/**
		 * Instantiate
		 *
		 * @description Setup the structures on first run
		 */
		_init: function()
		{
			var self = this;

			this.$slidelist = this.$slideshow.children('.slides');
			this.$slides = this.$slidelist.find('.slide'); // We can't use more efficient .children() treewalker because of WYSIWYG

			this.count = this.$slides.length;
			this.current = 0;

			// Only run if there is more than 1 slide
			if ( this.count <= 1 )
			{
				return;
			}

			// Setup styles
			this.$slideshow.css({
				position: 'relative',
				overflow: 'hidden'
			});

			this._transitions[ this.opts.transition ].setup.call(this);

			// Create controls
			if (this.opts.pagination)
			{
				this.$pagination = $('<ul class="slides-pagination" />');

				for (var i = 0; i < this.count; i++)
				{
					$('' +
						'<li class="' + ( i === this.current ? 'selected' : '' ) + '">' +
							'<a data-slides="' + i + '" href="">' + i + '</a>' +
						'</li>'
					).appendTo( this.$pagination );
				}

				this.$pagination.appendTo( this.$slideshow );
			}

			if (this.opts.skip)
			{
				this.$next = $('<a class="slides-next" data-slides="next" href="">Next</a>').appendTo( this.$slideshow );
				this.$previous = $('<a class="slides-previous" data-slides="previous" href="">Previous</a>').appendTo( this.$slideshow );
			}

			// Events
			if (this.opts.pagination || this.opts.skip)
			{
				this.$slideshow.on('click.slides', '[data-slides]', function(e)
				{
					if ( ! $(this).hasClass('disabled'))
					{
						self.to( $(this).data('slides') );

						// Stop autoplay
						self.timeout && clearTimeout( self.timeout );
					}

					e.preventDefault();
				});
			}

			this.$slideshow.on('update.slides', function()
			{
				self._update();
			});

			// Gestures - modified from Zepto.js <https://github.com/madrobby/zepto/blob/master/src/touch.js>
			if ( this.opts.gestures && 'ontouchstart' in document.documentElement )
			{
				this.target.addEventListener('touchstart', function(e)
				{
					self.t = {
						x1: e.touches[0].pageX,
						y1: e.touches[0].pageY,
						el: e.touches[0].target
					};
				}, false);

				this.target.addEventListener('touchmove', function(e)
				{
					self.t.x2 = e.touches[0].pageX;
					self.t.y2 = e.touches[0].pageY;

					if (Math.abs(self.t.x1 - self.t.x2) > 30)
					{
						e.preventDefault();
					}
				}, false);

				this.target.addEventListener('touchend', function()
				{
					if ( (self.t.x2 > 0 || self.t.y2 > 0) && (Math.abs(self.t.x1 - self.t.x2) > 30 || Math.abs(self.t.y1 - self.t.y2) > 30) )
					{
						var dir = function()
						{
							if (Math.abs(self.t.x1 - self.t.x2) >= Math.abs(self.t.y1 - self.t.y2))
							{
								return self.t.x1 - self.t.x2 > 0 ? 'Left' : 'Right';
							}
							else
							{
								return self.t.y1 - self.t.y2 > 0 ? 'Up' : 'Down';
							}
						}();

						if (dir === 'Left')
						{
							self.to(self.current + 1);
						}
						else if (dir === 'Right')
						{
							self.to(self.current - 1);
						}

						// Stop autoplay
						self.timeout && clearTimeout(self.timeout);
					}
				}, false);
			}

			// Autoplay
			this.to(this.current);

			if (this.opts.auto)
			{
				this.timeout = setInterval(function()
				{
					self.to( self.current + 1 );
				}, this.opts.auto);
			}
		},

		_update: function()
		{
			if (this.opts.pagination)
			{
				this.$pagination
					.children()
					.removeClass('selected')
					.eq( this.current )
					.addClass('selected');
			}

			if (this.opts.skip && ! this.opts.loop)
			{
				if ( this.hasNext() )
				{
					this.$next.addClass('disabled');
				}
				else
				{
					this.$next.removeClass('disabled');
				}

				if ( this.hasPrevious() )
				{
					this.$previous.addClass('disabled');
				}
				else
				{
					this.$previous.removeClass('disabled');
				}
			}

			// Callback
			if (this.opts.onupdate)
			{
				this.opts['onupdate'](this.current);
			}
		},

		_transitions: {
			crossfade: {
				setup: function()
				{
					var self = this;

					this.$slides
						.css({ // Avoid setting absolute positioning as it means setting a height of a parent element
							top: 0,
							left: 0
						})
						.filter(function(i) // <http://jsperf.com/jquery-fastest-neq-filter>
						{
							return i !== self.current;
						})
						.css('display', 'none');
				},
				execute: function(to)
				{
					var $next = this.$slides.eq(to).css('position', 'absolute').fadeIn(this.opts.speed, this.opts.easeIn);

					this.$slides.eq(this.current).fadeOut(this.opts.speed, this.opts.easeOut, function()
					{
						$next.css('position', 'static');
					});
				},
				teardown: function()
				{
					this.$slides.removeAttr('style');
				}
			},
			scroll: {
				setup: function()
				{
					this.$slidelist.css({
						position: 'relative',
						left: 0,
						minWidth: this.$slides.outerWidth(true) * this.count // setting width property does not work on iOS 4
					});

					this.$slides.css('float', 'left');
				},
				execute: function(to)
				{
					this.$slidelist.animate({ left: this.$slides.eq( to ).position().left * -1 }, this.opts.speed, this.opts.easing);
				},
				teardown: function()
				{
					this.$slidelist.removeAttr('style');
					this.$slides.removeAttr('style');
				}
			}
		},

		hasNext: function()
		{
			return (this.current === this.count - 1);
		},

		hasPrevious: function()
		{
			return (this.current === 0);
		},

		// Next
		next: function()
		{
			this.to( this.current + 1 );
		},

		// Previous
		previous: function()
		{
			this.to( this.current - 1 );
		},

		// Go to x
		to: function(x)
		{
			// If current slide is animating ignore the request,
			if ( ! this.opts.queue && this.$slides.queue('fx').length ) // <http://jsperf.com/animated-pseudo-selector/3>
			{
				return;
			}

			// Shortcuts
			if (x === 'next')
			{
				x = this.current + 1;
			}
			else if (x === 'previous')
			{
				x = this.current - 1;
			}

			// Loop
			if (x > this.count - 1)
			{
				if ( ! this.opts.loop)
				{
					clearInterval( this.timeout );
					return;
				}

				x = 0;
			}
			else if (x < 0)
			{
				if ( ! this.opts.loop)
				{
					return;
				}

				x = this.count - 1;
			}

			if (x !== this.current)
			{
				this._transitions[ this.opts.transition ].execute.call(this, x);
				this.current = x;
			}

			this.$slideshow.trigger('update');
		},

		// Transition redraw
		redraw: function()
		{
			this._transitions[ this.opts.transition ].teardown.call(this);
			this._transitions[ this.opts.transition ].setup.call(this);
		}
	};

	// jQuery plugin wrapper
	$.fn.slides = function(options)
	{
		return this.each(function()
		{
			var $this = $(this);

			if ( ! $this.data('slides') )
			{
				$.data(this, 'slides', new Slides($this, $.extend({}, options, $this.data())) );
			}
		});
	};

})(jQuery);