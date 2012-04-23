/**
 * @name        Slides
 * @author      Matt Hinchliffe <http://www.maketea.co.uk>
 * @modified    23/04/2012
 * @version     1.1.0
 * @description jQuery Slideshow
 * @example
 * <div class="slideshow">
 *     <ul class="carousel">
 *         <li class="slide"><a href="#">Option 1</a></li>
 *         <li class="slide"><a href="#">Option 2</a></li>
 *     </ul>
 * </div>
 *
 * @example
 * var slideshow = $('.slideshow').slides(opts).eq(0).data('slides');
 */

/*jshint trailing:true, smarttabs:true */
; (function($, undefined)
{
	"use strict";

	var defaults = {
		auto: 6000,               // Autoplay timeout in milliseconds. Set to false for no autoplay.
		speed: 600,               // Animation speed between slides in milliseconds.
		carousel: '.carousel',    // Selector for the carousel element
		items: '.slide',          // Selector for carousel items
		easing: 'swing',          // Animation easing for single transition
		easeIn: 'swing',          // Animation easing on fade in.
		easeOut: 'swing',         // Animation easing on fade out.
		pagination: true,         // Render pagination.
		skip: true,               // Render next/previous skip buttons.
		queue: false,             // Allow .to() method while animations are queued.
		loop: false,              // Allow slideshow to loop.
		transition: 'scroll',     // Specify transition.
		gestures: true,           // Allow touch swipe events to control previous/next.
		onupdate: undefined       // A callback function to execute on update event.
	};

	$.Slides = function(target, options)
	{
		this.target = target;
		this.$target = $(target);
		this.opts = $.extend(defaults, options, this.$target.data());

		this._init();

		return this;
	};

	$.Slides.prototype = {

		/**
		 * Instantiate
		 *
		 * @description Setup the structures on first run
		 */
		_init: function()
		{
			var self = this;

			this.$carousel = this.$target.children( this.opts.carousel );
			this.$items = this.$carousel.children( this.opts.items );

			this.count = this.$items.length;
			this.current = 0;

			// Only run if there is more than 1 slide
			if ( this.count <= 1 )
			{
				return;
			}

			// Setup styles
			this.$target.css('position', 'relative');
			this.$carousel.wrap('<div style="overflow:hidden;" />');

			this._transitions[ this.opts.transition ].setup.call(this);

			// Create controls
			if (this.opts.pagination)
			{
				this.$pagination = $('<ul class="slides-pagination" />');

				for (var i = 0; i < this.count; i++)
				{
					$('<li class="' + ( i === this.current ? 'selected' : '' ) + '">' +
						'<a data-slides="' + i + '" href="">' + (i + 1) + '</a>' +
					  '</li>').appendTo( this.$pagination );
				}

				this.$pagination.appendTo( this.$target );
			}

			if (this.opts.skip)
			{
				this.$next = $('<a class="slides-next" data-slides="next" href="">Next</a>').appendTo( this.$target );
				this.$previous = $('<a class="slides-previous" data-slides="previous" href="">Previous</a>').appendTo( this.$target );
			}

			// Events
			if (this.opts.pagination || this.opts.skip)
			{
				this.$target.on('click.slides', '[data-slides]', function(e)
				{
					e.preventDefault();

					var $this = $(this);

					if ( ! $this.hasClass('disabled'))
					{
						self.to( $this.data('slides') );

						// Stop autoplay
						if (self.timeout)
						{
							clearTimeout( self.timeout );
						}
					}
				});
			}

			this.$target.on('update.slides', function()
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
								return self.t.x1 - self.t.x2 > 0 ? 'left' : 'right';
							}
							else
							{
								return self.t.y1 - self.t.y2 > 0 ? 'up' : 'down';
							}
						}();

						if ( dir === 'left' )
						{
							self.to(self.current + 1);
						}
						else if ( dir === 'right' )
						{
							self.to(self.current - 1);
						}

						// Stop autoplay
						if (self.timeout)
						{
							clearTimeout(self.timeout);
						}
					}
				}, false);
			}

			this.to(this.current);

			// Autoplay
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
				this.opts.onupdate.call(this, this.current);
			}
		},

		_transitions: {
			crossfade: {
				setup: function()
				{
					var self = this;

					this.$items
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
					var $next = this.$items.eq(to).css('position', 'absolute').fadeIn(this.opts.speed, this.opts.easeIn);

					this.$items.eq(this.current).fadeOut(this.opts.speed, this.opts.easeOut, function()
					{
						$next.css('position', 'static');
					});
				},
				teardown: function()
				{
					this.$items.removeAttr('style');
				}
			},
			scroll: {
				setup: function()
				{
					var slide = this.$items.css('float', 'left').outerWidth(true);

					this.$carousel.css({
						position: 'relative',
						left: 0,
						minWidth: slide * this.count // setting width property does not work on iOS 4
					});

					this.realcount = this.count;
					this.count = this.count - Math.ceil(this.$target.width() / slide) + 1;
				},
				execute: function(to)
				{
					this.$carousel.animate({ left: this.$items.eq( to ).position().left * -1 }, this.opts.speed, this.opts.easing);
				},
				teardown: function()
				{
					this.count = this.realcount;
					delete this.realcount;

					this.$carousel.removeAttr('style');
					this.$items.removeAttr('style');
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
			if ( ! this.opts.queue && this.$items.queue('fx').length ) // <http://jsperf.com/animated-pseudo-selector/3>
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

			this.$target.trigger('update');
		},

		// Transition redraw
		redraw: function(transition)
		{
			this._transitions[ this.opts.transition ].teardown.call(this);

			if (transition)
			{
				this.opts.transition = transition;
			}

			this._transitions[ this.opts.transition ].setup.call(this);

			this.to(0);
		}
	};

	// jQuery plugin wrapper
	$.fn.slides = function(options)
	{
		return this.each(function(i)
		{
			if ( ! $.data(this, 'slides') )
			{
				$.data(this, 'slides', new $.Slides(this, options) );
			}
		});
	};

})(jQuery);