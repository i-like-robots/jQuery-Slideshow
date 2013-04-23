(function( $, undefined ) {

    'use strict';

    var defaults = {

        // Setup
        carousel: '.carousel',      // Selector for the carousel element.
        items: '.slide',            // Selector for carousel items.
        slideWidth: false,          // Set a fixed width for each slide.
        jumpQueue: true,            // Allow .to() method while animations are queued.
        offset: 1,                  // Starting slide.

        // Controls
        skip: true,                 // Render next/previous skip buttons.
        pagination: true,           // Render pagination.
        gestures: false,            // Allow touch swipe events to control previous/next.
        auto: 6000,                 // Autoplay timeout in milliseconds. Set to false for no autoplay.
        autostop: true,             // Stop autoplay when user manually changes slide.
        hoverPause: false,          // Pause autoplay on hover.
        loop: false,                // Allow slideshow to loop.
        nextText: 'Next',           // Text to display on next skip button
        previousText: 'Previous',   // Text to display on previous skip button

        // Transitions
        transition: 'scroll',       // Specify transition.
        speed: 600,                 // Animation speed between slides in milliseconds.
        easing: 'swing',            // Animation easing between slides.
        visible: 1,                 // Number of slides visible when scrolling.

        // Callbacks
        onupdate: false,            // A callback function to execute on slide change.
        oncomplete: false           // A callback function to execute on slide transition complete.
    };

    function Slides(target, options) {

        this.target = target;
        this.$target = $(target);
        this.opts = $.extend({}, defaults, options, this.$target.data());
        this.$carousel = this.$target.children(this.opts.carousel);
        this.$items = this.$carousel.children(this.opts.items);
        this.count = this.$items.length;

        if ( this.count > 1 ) {
            this._init();
        }

        return this;
    }

    /**
     * Init
     * @private
     */
    Slides.prototype._init = function() {

        var self = this;

        // $wrapper is a document fragment, not the new DOM reference
        this.$wrapper = this.$carousel.wrap('<div style="position:relative;overflow:hidden;">').parent();

        // Create pagination
        if ( this.opts.pagination ) {
            this.$pagination = $('<ul class="slides-pagination">');

            for ( var i = 0, len = this.count; i < len; i++ ) {
                this.$pagination.append('<li><a href="#" data-slides="' + i + '">' + (i+1) + '</a></li>');
            }

            this.$target.append(this.$pagination);
        }

        // Create skip links
        if ( this.opts.skip ) {
            this.$prev = $('<a href="#" class="slides-prev" data-slides="previous">' + this.opts.previousText + '</a>');
            this.$next = $('<a href="#" class="slides-next" data-slides="next">' + this.opts.nextText + '</a>');
            this.$target.append(this.$next, this.$prev);
        }

        // Controls
        if ( this.opts.pagination || this.opts.skip ) {

            this.$target.on('click.slides', '[data-slides]', function( e ) {

                e.preventDefault();

                var $this = $(this);

                if ( ! $this.hasClass('disabled') ) {
                    self.to($this.data('slides'), true);
                }
            });
        }

        this.redraw();

        //
        // Gestures modified from Zepto.js <https://github.com/madrobby/zepto/blob/master/src/touch.js>
        // This will be buggy on iOS6 but you can try and work around it: <https://gist.github.com/3755461>
        //
        if ( this.opts.gestures && 'ontouchstart' in document.documentElement ) {
            this.target.addEventListener('touchstart', function( e ) {
                self.t = {
                    x1: e.touches[0].pageX,
                    el: e.touches[0].target,
                    dif: 0
                };
            }, false);

            this.target.addEventListener('touchmove', function( e ) {
                self.t.x2 = e.touches[0].pageX;
                self.t.dif = Math.abs(self.t.x1 - self.t.x2);
                e.preventDefault();
            }, false);

            this.target.addEventListener('touchend', function() {
                if (  self.t.x2 > 0 && self.t.dif > 30  ) {
                    self.to( self.t.x1 - self.t.x2 > 0 ? 'next' : 'previous' , true);
                }
            }, false);
        }

        // Autoplay
        if ( this.opts.auto ) {
            if ( this.opts.hoverPause ) {
                this.$target.hover(function() {
                    if ( ! self.stopped ) {
                        self.pause();
                    }
                }, function() {
                    if ( self.paused ) {
                        self.play();
                    }
                });
            }

            this.play();
        }
    };

    /**
     * On Complete
     * @description Update controls and perform callbacks on transition complete.
     * @private
     */
    Slides.prototype._oncomplete = function() {

        this.current = this.future;

        // Highlight current item within pagination
        if ( this.opts.pagination ) {
            this.$pagination.children()
                .removeClass('selected')
                .slice(this.current, this.current + this.opts.visible)
                .addClass('selected');
        }

        // Disable skip buttons when not looping
        if ( this.opts.skip ) {
            if ( ! this.hasNext() && ! this.opts.loop ) {
                this.$next.addClass('disabled');
            }
            else {
                this.$next.removeClass('disabled');
            }

            if ( ! this.hasPrevious() && ! this.opts.loop ) {
                this.$prev.addClass('disabled');
            }
            else {
                this.$prev.removeClass('disabled');
            }
        }

        if ( this.opts.oncomplete ) {
            this.opts.oncomplete.call(this, this.current);
        }
    };

    /**
     * Has next
     * @description Are there any slides after current item (ignores loop).
     * @returns {boolean}
     */
    Slides.prototype.hasNext = function() {
        return this.current < (this.count - 1);
    };

    /**
     * Has previous
     * @description Are there any slides previous to current item (ignores loop).
     * @returns {boolean}
     */
    Slides.prototype.hasPrevious = function() {
        return this.current > 0;
    };

    /**
     * Next
     */
    Slides.prototype.next = function() {
        this.to(this.current + 1);
    };

    /**
     * Previous
     */
    Slides.prototype.previous = function() {
        this.to(this.current - 1);
    };

    /**
     * Go to slide
     * @param {integer} x
     * @param {boolean} user
     */
    Slides.prototype.to = function( x, user ) {

        // Allow while animating?
        if ( this.opts.jumpQueue ) {
            this.$items.stop(true, true);
        }
        else if ( this.$items.queue('fx').length ) { // <http://jsperf.com/animated-pseudo-selector/3>
            return;
        }

        // Shortcuts
        if ( x === 'next' ) {
            x = this.current + 1;
        }
        else if ( x === 'previous' ) {
            x = this.current - 1;
        }

        if ( typeof x !== 'number' ) {
            x = parseInt(x, 10);
        }

        // Loop
        if ( x >= this.count ) {
            x = this.opts.loop ? 0 : this.count - 1;
        }
        else if ( x < 0 ) {
            x = this.opts.loop ? this.count - 1 : 0;
        }

        // Stop or reset autoplay
        if ( user && ! this.stopped ) {
            if ( this.opts.autostop ) {
                this.stop();
            }
            else if ( ! this.paused ) {
                this.play();
            }
        }

        // Change slide if different or not yet run
        if ( x !== this.current ) {
            this.future = x;
            this.transition.execute.call(this);

            if ( this.opts.onupdate ) {
                this.opts.onupdate.call(this, x);
            }
        }
    };

    /**
     * Redraw the carousel
     * @param {string} transition
     */
    Slides.prototype.redraw = function( transition ) {

        if ( this.transition ) {
            this.transition.teardown.call(this);
        }

        if ( transition ) {
            this.opts.transition = transition;
        }

        this.current = undefined;
        this.transition = Transitions[this.opts.transition].call(this);
        this.to(this.opts.offset - 1);
    };

    /**
     * Start autoplay
     */
    Slides.prototype.play = function() {
        var self = this;

        clearInterval(this.timeout);
        this.paused = this.stopped = false;

        this.timeout = setInterval(function() {
            self.to('next');
        }, this.opts.auto);
    };

    /**
     * Pause autoplay
     */
    Slides.prototype.pause = function() {
        this.paused = true;
        clearInterval(this.timeout);
    };

    /**
     * Stop (and clear) autoplay
     */
    Slides.prototype.stop = function() {
        this.stopped = true;
        this.paused = false;
        clearInterval(this.timeout);
    };

    /**
     * Transitions
     * @description Methods are called from a Slides instance. In theory this could be extended or replaced without
     * affecting the slideshow core.
     */
    var Transitions = {

        crossfade: function() {
            var self = this;

            this.$items
                .filter(function(i) {
                    return i !== (self.opts.offset - 1);
                })
                .css('display', 'none');

            this.execute = function() {
                var $next = this.$items.eq(this.future),
                    $current = this.$items.eq(this.current).css({
                        position: 'absolute',
                        left: 0,
                        top: 0
                    });

                $next.fadeIn(this.opts.speed, this.opts.easing, function() {
                    self._oncomplete.call(self);
                });

                $current.fadeOut(this.opts.speed, this.opts.easing, function() {
                    $current.css('position', '');
                });
            };

            this.teardown = function() {
                this.$items.stop(true, true).removeAttr('style');
            };

            return this;
        },

        // Scroll
        scroll: function() {
            var self = this;

            this.$items.css({
                'float': 'left',
                'width': this.opts.slideWidth
            });

            this.$carousel.css({
                'minWidth': this.$items.outerWidth(true) * this.count // setting width property does not work on iOS 4
            });

            this.realcount = this.count;
            this.count -= this.opts.visible - 1;

            this.execute = function() {

                var left = this.$items.eq(this.future).position().left + this.$wrapper.scrollLeft();

                this.$wrapper.animate({
                    scrollLeft: left // Scroll prevents redraws
                }, this.opts.speed, this.opts.easing, function() {
                    self._oncomplete.call(self);
                });
            };

            this.teardown = function() {
                this.count = this.realcount;
                this.$carousel.stop(true, true).removeAttr('style');
                this.$items.removeAttr('style');
            };

            return this;
        }
    };

    // jQuery plugin wrapper
    $.fn.slides = function( options ) {
        return this.each(function() {
            if ( ! $.data(this, 'slides') ) {
                $.data(this, 'slides', new Slides(this, options));
            }
        });
    };

    // AMD and CommonJS module compatibility
    if ( typeof define === 'function' && define.amd ){
        define(function() {
            return Slides;
        });
    }
    else if ( typeof module !== 'undefined' && module.exports ) {
        module.exports = Slides;
    }

})(jQuery);