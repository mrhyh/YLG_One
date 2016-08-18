/**
 * 统计工具
 */
/**
 * umeng统计
 */
var is_android = /android/i.test(navigator.userAgent);
var event_type = is_android ? 'log_event' : 'custom_event';

/**
 * 发送umeng统计
 * @param  {string} tag   tag
 * @param  {string} label label
 * @param  [object] sobj  可能后缀的统计字段
 * @return {undefined}
 */
function send_umeng_event (tag, label, sobj) {
    var s = 'bytedance://' + event_type + '?category=umeng&tag=' + tag + '&label=' + label;

    if (sobj) {
        for (var sitem in sobj) {
            var svalue = sobj[sitem];
            if (sitem === 'extra' && typeof svalue === 'object') {
                if (is_android) {
                    s += '&extra=' + JSON.stringify(svalue);
                } else {
                    var e = '';
                    for (var eitem in svalue) {
                        if (typeof svalue[eitem] === 'object') {
                            e += '&' + eitem + '=' + JSON.stringify(svalue[eitem]);
                        } else {
                            e += '&' + eitem + '=' + svalue[eitem];
                        }
                    }
                    s += e;
                }
            } else {
                s += '&' + sitem + '=' + svalue;
            }
        }
    }

    // NOTE console.log也能发统计
    //      我CTM哪个脑残定的这种方法，调试也TM不能调了，还TM踩坑，我去年买了个表！
    //      https://wiki.bytedance.com/pages/viewpage.action?pageId=20777525
    console.log(s);
    // location.href = s;
}

/**
 * 向客户端发送bytedance://请求，如加载各种类型图片
 * @param {string} protocol 协议类型
 * @param [object] params 传递给客户端的参数对象（可选，部分协议类型不需要此参数）
 */
function send_request (protocol, params) {
    var s = 'bytedance://' + protocol;
    if (params) {
        s += '?';
        for (var field in params) {
            s += (field + '=' + params[field] + '&');
        }
        s = s.slice(0, -1);
    }
    location.href = s;
}

/**
* show事件，相关DOM区域滚动到屏幕中可见时仅发送一次友盟事件
* @param {object} target 目标DOM
* @param {function} event_handle 目标元素露出后的处理函数（发送友盟事件）
* @param {boolean} shownTotally 是否DOM底部完全露出后才发送事件
*/
function send_exposure_event_once(target, event_handle, shownTotally){
    if(!target || typeof event_handle != 'function') return;

    var scrollTimer     = 0,
        viewHeight      = window.innerHeight;

    if( is_inview(target, viewHeight) ){
         event_handle();
     }else{
        document.addEventListener("scroll", page_scroll, false);
    }

    function page_scroll(){
        if (scrollTimer) {
            clearTimeout(scrollTimer);
        }
        scrollTimer = setTimeout(function () {
            var flag = is_inview(target, viewHeight);
            console.info(flag, target);
            if( flag ){
                event_handle();
                document.removeEventListener("scroll", page_scroll, false);
            }
        }, 50);
    }

    function is_inview(con, viewHeight){
        var conRect     = con.getBoundingClientRect(),
            conTop      = conRect.top,
            conHeight   = conRect.height || conRect.bottom - conRect.top,
            _baseline   = conTop;

        if(shownTotally){
            _baseline = conTop + conHeight;
        }
        return _baseline < viewHeight;
    }
}
;

/**
 * 基础工具
 */
var hash = (function () {
    // e.g. #tt_image=origin&tt_font=m&tt_daymode=1
    var hash = location.hash.substr(1);
    var hashObject = {};

    if (hash) {
        hash.split('&').forEach(function(query){
            query = query.split('=');
            var field = query[0];
            var value = query[1];
            if (field) {
                hashObject[field] = value;
            }
        });
    }

    /**
     * 获取、设置页面hash
     * @param  {string|object} field hash的key
     * @param  {string|undefined} value hash的value
     * @return {string|undefined}
     *  hash('tt_image') => 'origin'
     *  hash('tt_font', 'xl') => tt_font=xl
     *  hash({'tt_image': 'none', 'tt_daymode': 0}) => tt_image=none&tt_daymode=0
     */
    return function (field, value) {
        var newHashObject = {};
        if (field === undefined && value === undefined) {
            return location.hash;
        }
        if (value === undefined && typeof field === 'string') {
            return hashObject[field];
        } else if (typeof field === 'string' && typeof value === 'string') {
            newHashObject[field] = value;
        } else if (value === undefined && typeof field === 'object') {
            newHashObject = field;
        }
        $.extend(hashObject, newHashObject);
        location.hash = hash2string(hashObject);
    };
})();

/**
 * 将hash从Object形式转换成string
 * @param  {object} hashObject hash对象
 * @return {string} hash字符串
 */
function hash2string (hashObject) {
    var hash = '#';
    for (var field in hashObject) {
        hash += field + '=' + hashObject[field]+ '&';
    }
    if (hash.substr(-1) == '&') {
        hash = hash.slice(0, -1);
    } else if (hash.substr(-1) == '#') {
        hash = '';
    }
    return hash;
}


/**
 * 获取页面meta信息
 */
var getMeta = (function () {
    var domMetas = document.getElementsByTagName('meta');
    var metasObj = {};
    for (var i = 0, len = domMetas.length; i < len; i++) {
        var name = domMetas[i].name.toLowerCase();
        var content = domMetas[i].getAttribute('content');
        if (name && content) {
            metasObj[name] = content;
        }
    }

    return function (name) {
        return metasObj[name];
    }
})();

/**
 * 获取location.search中的指定参数的值
 * @param {string} params 待查询参数
 */
function request (params) {
    var s = location.search.substr(1);
    var paraObj = {};

    if (s) {
        var arr = s.split('&');
        for (var i = 0; i< arr.length; i++) {
            var t = arr[i].split('=');
            paraObj[t[0]] = t[1];
        }
    }
    return paraObj[params.toLowerCase()];
}

/**
 * 判断视频是否处于屏幕可视区域
 * @param {object} element DOM
 * @return {boolean} 元素是否处于可视区域
 */
function _videoInView (element) {
    var coords = element.getBoundingClientRect();
    var video_height = coords.height || 100;
    return ((coords.top >= 0 && coords.left >= 0 && coords.top) <= (window.innerHeight || document.documentElement.clientHeight) - video_height);
}

/**
 * 格式化显示顶／赞／踩数量
 * @param  {string} selector 显示容器选择器
 * @param  {number} realnum  原始数值
 * @param  {string} placeholder   当原始数值为0时默认显示的字段
 * @return {string} 返回格式化后的数据
 */
function formatCount (selector, realnum, placeholder) {
    var formatnum = '';
    if (realnum === 0) {
        formatnum = placeholder || '赞';
    } else if (realnum < 1e4) {
        formatnum = realnum;
    } else if (realnum < 1e8) {
        var d = (realnum / 1e4).toFixed(1);
        formatnum = (d.indexOf('.0') > -1 ? d.slice(0, -2) : d) + '万';
    } else {
        var d = (realnum / 1e8).toFixed(1);
        formatnum = (d.indexOf('.0') > -1 ? d.slice(0, -2) : d) + '亿';
    }

    $(selector).each(function(){
        $(this).attr('realnum', realnum).html(formatnum);
    });

    return formatnum;
}

/**
 * 获取三位版本号
 * @return {undefined}
 */
function get_app_version () {
    var matches = /NewsArticle\/(\d\.\d\.\d)/i.exec(navigator.userAgent);
    if (matches) {
        return matches[1];
    }
    return '';
}

/**
 * 只取两位版本号做对比
 * @param  {number}  n 要对比的版本号
 * @return {Boolean}
 */
function is_android_version_bigger_than (n) {
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf('android') > -1) {
        var androidVersion = parseFloat(ua.substr(ua.indexOf('android') + 8, 3));
        return androidVersion >= n;
    } else {
        return true;
    }
}

/**
 * [is_app_version_bigger_than description]
 * @param  {[type]}  version [description]
 * @return {Boolean}         [description]
 */
function is_app_version_bigger_than (version) {
    var currentVersion = get_app_version();
    if (!currentVersion) {
        return false;
    }
    version = version.split('.');
    currentVersion = +currentVersion.split('.').slice(0, version.length).join('');

    return currentVersion >= (+version.join(''));
}
;

/**
 * 客户端调用渲染头尾部
 * TODO 有严重的bug隐患！在domcontentload事件之前调用是不对的！
 *      这个try也不太懂
 */
try{
	try {
window.globalArticleObject = {};
(function renderPage(h5extra, wendaextra, forumextra, zzcomments){
	function mergeArguments (h5extra, wendaextra, forumextra, zzcomments) {
		var defaults = {
			article: {
				type: 'zhuanma',
				title: h5extra.title || '',
				publishTime: h5extra.publish_time || '0000-00-00 00:00',
				originalLink: h5extra.src_link || ''
			},
			author: {
				id: '',
				name: '',
				link: '',
				intro: '',
				avatar: '',
				isAuthorSelf: false,
				verifiedContent: ''
				// 还有一个 followState 字段
			},
			tags: [],
		};

		if (wendaextra) {
			defaults.article.type = 'wenda';
		} else if (forumextra) {
			defaults.article.type = 'forum';
		} else if (!!h5extra.media) {
			defaults.article.type = 'pgc';
		}

		switch (defaults.article.type) {
			case 'wenda':
				defaults.article.publishTime = wendaextra.show_time;
				defaults.wenda = {
					id: wendaextra.ansid,
					aniok: is_android_version_bigger_than(4.4)
				};
				defaults.author = {
					id: wendaextra.user.user_id,
					name: wendaextra.user.user_name,
					link: wendaextra.user.schema,
					intro: wendaextra.user.user_intro,
					avatar: wendaextra.user.user_profile_image_url,
					isAuthorSelf: false, // 问答的isAuthorSelf通过set_info接口下发
					verifiedContent: wendaextra.user.is_verify ? ' ' : '',
					// 问答的关注状态通过set_info接口下发
				};
				break;
			case 'forum':
				defaults.article.publishTime = forumextra.publish_time;
				defaults.forum = {
					name: forumextra.forum_info.name,
					link: forumextra.forum_info.schema,
					readCount: forumextra.read_count || 0
				};
				defaults.author = {
					id: forumextra.user_info.id,
					name: forumextra.user_info.name,
					link: forumextra.user_info.schema,
					intro: forumextra.user_info.media ? forumextra.user_info.media.name : '',
					avatar: forumextra.user_info.avatar_url,
					isAuthorSelf: forumextra.is_author,
					verifiedContent: forumextra.user_info.verified_content
					// 帖子的关注状态通过set_info接口下发
				};
				var _intro = [];
				if (defaults.author.intro !== '') {
					_intro.push(defaults.author.intro);
				}
				if (defaults.author.verifiedContent !== '') {
					_intro.push(defaults.author.verifiedContent);
				}
				defaults.author.intro = _intro.join('，');
				defaults.tags = forumextra.label_list;
				break;
			case 'pgc':
				if (h5extra.is_original) {
					defaults.tags.push('原创');
				}
				defaults.author = {
					id: h5extra.media.id,
					name: h5extra.media.name,
					link: 'bytedance://media_account?media_id=' + h5extra.media.id + '&loc=0&entry_id=' + h5extra.media.id,
					intro: 'PLACEHOLDER',
					avatar: h5extra.media.avatar_url,
					isAuthorSelf: !!h5extra.is_author,
					verifiedContent: '', // PGC无加V
				};
				if ('is_subscribed' in h5extra) {
					defaults.author.followState = h5extra.is_subscribed ? 'following' : '';
				}
				break;
			default:
				defaults.author.name = h5extra.source;
				break;
		}

		// 转自头条号：xxx
		if (!h5extra.is_original && h5extra.original_media_id) {
			defaults.original = {
				link: 'bytedance://media_account?media_id=' + h5extra.original_media_id + '&entry_id=' + h5extra.original_media_id,
				name: h5extra.original_media_name || ''
			};
		}

		if (zzcomments) {
			defaults.zzcomments = zzcomments;
		}

		return defaults;
	}
	window.globalArticleObject = mergeArguments(h5extra, wendaextra, forumextra, zzcomments);

	var HeaderTemplateFunction = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='';
 if (article.type == 'zhuanma') { 
__p+='<div class="zhuanma-wrapper"><span>'+
((__t=(article.publishTime))==null?'':_.escape(__t))+
'</span><span>'+
((__t=(author.name))==null?'':_.escape(__t))+
'</span>';
 if (article.originalLink) { 
__p+='/<a class="original-link" href="'+
((__t=(article.originalLink))==null?'':_.escape(__t))+
'">查看原文</a>';
 } 
__p+='</div>';
 } else { 
__p+='<div class="authorbar '+
((__t=(article.type))==null?'':_.escape(__t))+
'" id="profile"><a class="author-avatar-link pgc-link" href="'+
((__t=(author.link))==null?'':_.escape(__t))+
'"><img class="author-avatar" src="'+
((__t=(author.avatar))==null?'':_.escape(__t))+
'"></a>';
 if (article.type === 'wenda') { 
__p+='<div class="wenda-info" style="display: '+
((__t=( author.isAuthorSelf ? 'block' : 'none' ))==null?'':_.escape(__t))+
';"><span class="read-info brow-count"></span><span class="like-info digg-count-special"></span></div>';
 } else if (article.type === 'forum') { 
__p+='<div class="wenda-info" style="display: '+
((__t=( author.isAuthorSelf ? 'block' : 'none' ))==null?'':_.escape(__t))+
';"><span>'+
((__t=(forum.readCount))==null?'':_.escape(__t))+
'阅读</span></div>';
 } 
__p+='<a class="follow-button '+
((__t=( 'followState' in author ? author.followState : 'disabled'))==null?'':_.escape(__t))+
'"data-authorid="'+
((__t=(author.id))==null?'':_.escape(__t))+
'"data-pagetype="'+
((__t=(article.type))==null?'':_.escape(__t))+
'"href="javascript:;"style="display: '+
((__t=( author.isAuthorSelf ? 'none' : 'block' ))==null?'':_.escape(__t))+
';"id="subscribe"><i>&nbsp;</i></a><div class="author-bar"><div class="name-link-w '+
((__t=( (author.intro === '' && tags.length === 0) ? 'no-intro' : '' ))==null?'':_.escape(__t))+
'"><a class="author-name-link pgc-link" href="'+
((__t=( author.link ))==null?'':_.escape(__t))+
'">'+
((__t=(author.name))==null?'':_.escape(__t))+
'</a>';
 if (author.verifiedContent !== '') { 
__p+='<div class="verified-icon">&nbsp;</div>';
 } 
__p+='</div><div class="sub-title-w"><div class="article-tags">';
 if (tags.length > 0) { 
__p+='';
 for (var tag in tags) { 
__p+='<div class="article-tag">'+
((__t=(tags[tag]))==null?'':_.escape(__t))+
'</div>';
 } 
__p+='';
 } 
__p+='</div>';
 if (article.type == 'pgc') { 
__p+='<span class="sub-title">'+
((__t=( article.publishTime ))==null?'':_.escape(__t))+
'</span>';
 } else { 
__p+='<span class="sub-title">'+
((__t=( author.intro ))==null?'':_.escape(__t))+
'</span>';
 } 
__p+='</div></div></div>';
 } 
__p+='';
}
return __p;
};
	var FooterTemplateFunction = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='';
 if (article.type == 'pgc' && typeof original != 'undefined' ) { 
__p+='<div class="carbon-copy"><span class="cc-text">转自头条号：</span><a class="cc-who" href="'+
((__t=(original.link))==null?'':_.escape(__t))+
'">'+
((__t=(original.name))==null?'':_.escape(__t))+
'</a></div>';
 } 
__p+='';
 if (article.type == 'wenda') { 
__p+='<div class="wenda-bottom clearfix"><div class="create-time">'+
((__t=(article.publishTime))==null?'':_.escape(__t))+
'</div></div><div class="bottom-buttons only-one"><div id="digg" data-answerid="'+
((__t=(wenda.id))==null?'':_.escape(__t))+
'" class="ib like" wenda-state="" aniok="'+
((__t=( wenda.aniok ))==null?'':_.escape(__t))+
'"><span><i>&nbsp;</i><span class="b digg-count" realnum="0">赞</span></span></div><div id="bury" data-answerid="'+
((__t=(wenda.id))==null?'':_.escape(__t))+
'" class="ib unlike" wenda-state="" aniok="'+
((__t=( wenda.aniok ))==null?'':_.escape(__t))+
'" style="display: none;"><span><i>&nbsp;</i><span class="b bury-count" realnum="0">踩</span></span></div></div>';
 } 
__p+='';
}
return __p;
};

	var headerTemplateString = HeaderTemplateFunction(globalArticleObject);
	var footerTemplateString = FooterTemplateFunction(globalArticleObject);

	$('body').addClass(globalArticleObject.article.type);

	// NOTE 客户端AB测试需求
	//      https://wiki.bytedance.com/pages/viewpage.action?pageId=13966145
	if (!('ab_client' in h5extra)) {
		h5extra.ab_client = [];
	}
	// f7表示为‘关注’版本，该情况下，详情页顶部展示‘＋关注’按钮
	// 其他情况下，展示为‘＋订阅’按钮
	if (globalArticleObject.article.type !== 'pgc' || h5extra.ab_client.indexOf('f7') > -1) {
		$('body').attr('topbutton-type', 'concern');
	}

	// 做header，article，footer的合法检查
	// TODO 这里的问题是，没有顾及到三个dom的数量超过1时的情景
	var $header = $('header');
	var $article = $('article');
	var $footer = $('footer');

	if ($header.length > 0) {
		$header.append(headerTemplateString);
	} else if ($article.length > 0) {
		$header = $('<header>');
		$header.html(headerTemplateString);
		$article.before($header);
	}

	if (globalArticleObject.zzcomments) {
		$header.prepend('<div class="zzcomments">\
		    <span class="rec-us"></span>\
		    <span class="rec-end" style="visibility: hidden;">推荐此文</span>\
		</div>');
	}

	if ($footer.length > 0) {
		$footer.html(footerTemplateString);
	} else if ($article.length > 0) {
		$footer = $('<footer>');
		$footer.html(footerTemplateString);
		$article.after($footer);
	}

	// 帖子将时间放在页面下，FIXME 危险：拼接字符串
	if (globalArticleObject.article.type === 'forum') {
		if ($('.poi').length > 0) {
			var location = $('.poi').text();
			$('.poi').replaceWith('<p class="poi"><span class="bottomtime">创建于' + globalArticleObject.article.publishTime + '</span><span class="location">' + location + '</span></p>');
		} else {
			$('article').append('<p class="poi no-poi-icon"><span class="bottomtime">创建于' + globalArticleObject.article.publishTime + '</span></p>');
		}
	}

	// 顶部转载，需要根据页面宽度计算展示内容
	// TODO: iPad横竖屏是否要考虑？
	if (globalArticleObject.zzcomments) {
		var shownMedias = [];
        var $rot = $(".zzcomments");
        var $dom = $(".rec-us");
        var $end = $(".rec-end");
		var zzgid = h5extra.gid || '';

        var domMaxWidth = $rot.width() - 15 - $end.width() - 15;

        var $tmp = $('<a class="rec-u" onclick="send_zz_umeng(\'' + zzcomments[0].media_info.media_id + '\');" href="bytedance://media_account?from=zzcomments&media_id=' + zzcomments[0].media_info.media_id + '">' + zzcomments[0].media_info.name + '</a>');
        $dom.append($tmp);
		shownMedias.push(zzcomments[0].media_info.media_id.toString());

		if ($dom.width() > domMaxWidth) {
			$rot.prepend($end).addClass('oneauthor');
		} else if (zzcomments.length > 1) {
			zzcomments.slice(1).every(function (obj, idx) {
				if (shownMedias.indexOf(obj.media_info.media_id.toString()) != -1) {
					return true;
				}
				var $dot = $('<span>、</span>');
				var $tmp = $('<a class="rec-u" onclick="send_zz_umeng(\'' + obj.media_info.media_id + '\');" href="bytedance://media_account?from=zzcomments&media_id=' + obj.media_info.media_id + '">' + obj.media_info.name + '</a>');
				$dom.append($dot);
				$dom.append($tmp);
				if ( $dom.width() > domMaxWidth ) {
					$dot.remove();
					$tmp.remove();
					return false;
				} else {
					shownMedias.push(obj.media_info.media_id.toString());
					return true;
				}
			});
		}
		$end.css("visibility", "visible");

		window.send_zz_umeng = function (media_id) {
			console.log('send_zz_umeng');
			send_umeng_event('detail', 'zz_comment_click', {
				value: zzgid,
				ext_value: media_id
			});
		};

		// 发统计参数
		$(function(){
			send_umeng_event('detail', 'show_zz_comment', {
				value: zzgid,
				ext_value: h5extra.item_id || '',
				extra: {
					media_ids: shownMedias.join(',')
				}
			});
		});
	}
})(window.h5_extra, window.wenda_extra, window.forum_extra, window.zz_comments);
}catch(ex){
	alert(ex);
}

// TODO 首先这个地方跟css已经不同步了，得把CSS里相应的部分删掉
(function (customStyles) {
	if (typeof customStyles !== 'object') {
		return;
	}
    var defaultStyles = {
        title_font_size: [23, 25, 27, 30],
        title_color: ['#222222', '#707070'],
        body_font_size: [16, 18, 20, 23],
        body_color: ['#222222', '#707070'],
        detail_backgroud_color: ['#ffffff', '#252525'],
    };
    var customStyles = $.extend(defaultStyles, customStyles);
	var CustomStyleTemplateFunction = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='';
 if (detail_backgroud_color) { /* 文章背景色 */ 
__p+='body {background-color: '+
((__t=( detail_backgroud_color[0] ))==null?'':_.escape(__t))+
';}body.night {background-color: '+
((__t=( detail_backgroud_color[1] ))==null?'':_.escape(__t))+
';}';
 } 
__p+='';
 if (title_color) { /* 标题颜色 */ 
__p+='.tt-title {color: '+
((__t=( title_color[0] ))==null?'':_.escape(__t))+
';}.night .tt-title {color: '+
((__t=( title_color[1] ))==null?'':_.escape(__t))+
';}';
 } 
__p+='';
 if (title_font_size) { /* 标题字号 */ 
__p+='.font_s .tt-title {font-size: '+
((__t=( title_font_size[0] ))==null?'':_.escape(__t))+
'px;}.tt-title, .font_m .tt-title {font-size: '+
((__t=( title_font_size[1] ))==null?'':_.escape(__t))+
'px;}.font_l .tt-title {font-size: '+
((__t=( title_font_size[2] ))==null?'':_.escape(__t))+
'px;}.font_xl .tt-title {font-size: '+
((__t=( title_font_size[3] ))==null?'':_.escape(__t))+
'px;}@media (max-device-width : 374px) {.font_s .tt-title {font-size: '+
((__t=( title_font_size[0] ))==null?'':_.escape(__t))+
'px;}.tt-title, .font_m .tt-title {font-size: '+
((__t=( title_font_size[1] ))==null?'':_.escape(__t))+
'px;}.font_l .tt-title {font-size: '+
((__t=( title_font_size[2] ))==null?'':_.escape(__t))+
'px;}.font_xl .tt-title {font-size: '+
((__t=( title_font_size[3] ))==null?'':_.escape(__t))+
'px;}}';
 } 
__p+='';
 if (body_color) { /* 正文颜色 */ 
__p+='article, p {color: '+
((__t=( body_color[0] ))==null?'':_.escape(__t))+
';}.night article,.night p {color: '+
((__t=( body_color[1] ))==null?'':_.escape(__t))+
';}';
 } 
__p+='';
 if (body_font_size) { /* 正文字号 */ 
__p+='.font_s article, .font_s p {font-size: '+
((__t=( body_font_size[0] ))==null?'':_.escape(__t))+
'px;}article, p, .font_m article, .font_m p {font-size: '+
((__t=( body_font_size[1] ))==null?'':_.escape(__t))+
'px;}.font_l article, .font_l p {font-size: '+
((__t=( body_font_size[2] ))==null?'':_.escape(__t))+
'px;}.font_xl article, .font_xl p {font-size: '+
((__t=( body_font_size[3] ))==null?'':_.escape(__t))+
'px;}@media (max-device-width : 374px) {.font_s article, .font_s p {font-size: '+
((__t=( body_font_size[0] ))==null?'':_.escape(__t))+
'px;}article, p, .font_m article, .font_m p {font-size: '+
((__t=( body_font_size[1] ))==null?'':_.escape(__t))+
'px;}.font_l article, .font_l p {font-size: '+
((__t=( body_font_size[2] ))==null?'':_.escape(__t))+
'px;}.font_xl article, .font_xl p {font-size: '+
((__t=( body_font_size[3] ))==null?'':_.escape(__t))+
'px;}}';
 } 
__p+='';
}
return __p;
};

	var style = document.createElement('style');
	style.innerHTML = CustomStyleTemplateFunction(customStyles);
	document.querySelector('head').appendChild(style);
	style = null;
})(window.custom_style);
;
} catch (ex) {
	if (window.IS_DEBUGING_WEBIVEW) {
		alert(ex);
	}
}

/**
 * 引入客户端接口文件
 */
/****************************************************************
 * 这里面的方法都是供客户端调用的
 *****************************************************************/
/**
 * 帖子调用更新标签信息
 * @param  {array|string} tags 要展示的tags
 * @return {undefined}
 */
function update_forum_tags (tags) {
    if (typeof tags === 'string') {
        tags = tags.split(',');
    }
    var $newtag = $('<div class="article-tags">');
    tags.forEach(function(tag){
        if (tag !== '') {
            $newtag.append($('<div class="article-tag">').html(tag));
        }
    });

    // 处理姓名单行居中问题
    if (tags.length >= 1) {
        $('.name-link-w').removeClass('no-intro');
    } else if ($('.sub-title').text() === '') {
        $('.name-link-w').addClass('no-intro');
    }

    $('.article-tags').replaceWith($newtag);
}

/**
 * 客户端在webview“挂起”时调用
 * @return {undefined}
 */
function on_page_disappear () {
    // 停止所有音乐的播放
    $('audio').each(function(){
        this.pause();
    });
}

/**
 * 问答、帖子调用更新信息
 * @param {object} states 透传信息
 */
var wendaStates = {};
function set_info (states) {
    if (typeof states === 'string') {
        states = JSON.parse(states); // android貌似不能传递对象
    } else if (typeof states !== 'object') {
        return;
    }

    _.extend(window.wendaStates, states); // TODO 改成debug模式才写全局变量

    // 作者本人不展示关注按钮
    if ('isAuthor' in states) {
        if (states.isAuthor) {
            $('.follow-button').hide();
            $('.wenda-info').show();
        } else {
            $('.follow-button').show();
            $('.wenda-info').hide();
        }
    }

    // 问答数据
    if ('brow_count' in states) {
        $('.brow-count').text(states.brow_count);
        formatCount('.brow-count', states.brow_count, '0');
    }

    if ('is_digg' in states && 'digg_count' in states) {
        if (states.is_digg) {
            $('#digg').attr({
                'wenda-state': 'digged',
                'aniok': 'false'
            });
        }
        formatCount('.digg-count', states.digg_count, '赞');
        formatCount('.digg-count-special', states.digg_count, '0');
    }

    if ('is_buryed' in states && 'bury_count' in states) {
        if (states.is_buryed) {
            $('#bury').attr({
                'wenda-state': 'buryed',
                'aniok': 'false'
            });
        }
        formatCount('.bury-count', states.bury_count, '踩');
    }

    if ('is_show_bury' in states && states.is_show_bury) {
        $('#bury').show().parent().removeClass('only-one').addClass('only-two');
    }

    // 关注状态
    if ('is_concern_user' in states) {
        var $button = $('#subscribe').removeClass('disabled');
        $button[states.is_concern_user ? 'addClass' : 'removeClass']('following');
    }
}

/**
 * 获取header的位置
 * @return {undefined}
 * @ios
 * NOTE 为解决iOS的UIWebview上scroll事件不停手就不执行逻辑的bug
 */
function getElementPosition (selector) {
    var dom = document.querySelector(selector);
    if (dom) {
        var coords = dom.getBoundingClientRect();
        return '{{' + coords.left + ',' + dom.offsetTop + '},{' + coords.width + ',' + coords.height + '}}';
    }
    return '{{0,0},{0,0}}';
}

/**
 * 设置正文字号大小
 * @param {string} s 类型[_标准正文字号]
 * NOTE px先保留，后续处理
 */
function setFontSize (s) {
    var type = s.split('_')[0];
    var px = s.split('_')[1];
    var validTypes = ['s', 'm', 'l', 'xl'];
    var allClasses = $.map(validTypes, function(i){
        return 'font_' + i;
    }).join(' ');

    if (validTypes.indexOf(type) > -1) {
        $('body').removeClass(allClasses).addClass('font_' + type);
    }
}

/**
 * 设置日夜间模式
 * @param {number} flag 1代表日间，0代表夜间
 */
function setDayMode (flag) {
    var validFlags = [0, 1, '0', '1'];
    if (validFlags.indexOf(flag) > -1) {
        flag = parseInt(flag);
        $('body')[flag ? 'removeClass' : 'addClass']('night');
    }
}

var TouTiao = {
    setFontSize: setFontSize,
    setDayMode: setDayMode
};

/**
 * 关闭视频时，APP调用此函数通知web，恢复视频原始位置
 * @param {number} vid 视频ID
 * @android
 */
function appCloseVideoNoticeWeb (vid) {
    var $video = $('[data-vid="' + vid + '"]');
    $video.each(function(idx, video){
        $(this).css('display', 'block');
        $('body').css('margin-top', '0px');
    });
}

/**
 * 获取vid对应的视频的位置、尺寸信息供客户端横屏-->竖屏变换时恢复视频使用
 * @param {number} vid 视频id
 * @return {string} 尺寸
 * @ios
 */
function getVideoFrame (vid) {
    var video = document.querySelector('[data-vid="' + vid + '"]');
    var frame = '{{0,0},{0,0}}';
    if (video) {
        var coords = video.getBoundingClientRect();
        frame = '{{' + coords.left + ',' + v.offsetTop + '},{' + coords.width + ',' + coords.height + '}}';
    }
    return frame;
}
;

/**
 * 引入服务端接口文件
 */
/****************************************************************
 * 这里的方法都是供服务端调用的
 *****************************************************************/
/**
 * @deprecated
 * 赞赏历史人数实时更新
 * @param  {number} latest_praise_num 最新赞赏人数
 * @return {undefined}
 */
function updateAppreciateCountByServer (latest_praise_num) {}

/**
 * 服务端告知是否已订阅头条号
 * @param  {boolean} following 是否已订阅
 * @param  {string}  host       访问订阅API的host
 * @param  {string}  args       访问订阅API时需要携带的其他参数
 * @return {undefined}
 * NOTE 此逻辑应只在pgc页面生效
 */
function subscribe_switch (following, host, args) {
    if (globalArticleObject.article.type == 'pgc') {
        var $button = $('#subscribe').removeClass('disabled');
        if (following) {
            $button.addClass('following');
        } else {
            $button.removeClass('following');
        }
    }
}

/**
 * 后期追加页面信息，比如用于A/B测试
 * @param {object} context 服务端下发数据
 */
window.infoInserted = false;
function insertDiv (context) {
    if (!window.infoInserted) {
        try {
            /**
 * 根据服务端information接口context字段中的JSON格式数据，由前端构造相应DOM插入到页面中
 *
 * 统一的交由客户端调用的接口签名是 insertDiv(JSON data);
 *
 * NOTE
 * 1. 由于information为异步加载，输出内容如果在页面首屏，效果会非常差。
 */
var contextRenderer = function(context){
	if (typeof context !== 'object') {
		return;
	}

	if ('fakecontext' in window) {
		context = fakecontext;
	}

	/**
	 * 目录功能，连载文章在底部展示目录
	 */
	(function(){
		var TOCTemplateFunction = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="serial">';
 if (series_link.pre_gid) { 
__p+='<a class="prev" href="sslocal://detail?groupid='+
((__t=(series_link.pre_gid))==null?'':_.escape(__t))+
'">上一篇</a>';
 } else { 
__p+='<span class="prev">上一篇</span>';
 } 
__p+='';
 if (series_link.next_gid) { 
__p+='<a class="next" href="sslocal://detail?groupid='+
((__t=(series_link.next_gid))==null?'':_.escape(__t))+
'">下一篇</a>';
 } else { 
__p+='<span class="next">下一篇</span>';
 } 
__p+='<div class="index-wrap"><a class="index" href="'+
((__t=(series_link.subject))==null?'':_.escape(__t))+
'">目录（共'+
((__t=(series_link.serial_count))==null?'':_.escape(__t))+
'章）</a></div></div>';
}
return __p;
};
		if ('series_link' in context) {
			$('footer').prepend(TOCTemplateFunction(context));
		}
	})();

	/**
	 * 卡片
	 */
	(function(){
		var cardTemplateFunctions = {
			'movie': function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<a class="card dianying" href="'+
((__t=(url))==null?'':_.escape(__t))+
'"><div class="card-hd"><img src="'+
((__t=(poster))==null?'':_.escape(__t))+
'"></div><div class="card-bd"><p class="title">'+
((__t=(name))==null?'':_.escape(__t))+
'</p><p class="sub-title">'+
((__t=(participated))==null?'':_.escape(__t))+
'人在参与讨论</p>';
 if (typeof score === 'number') { 
__p+='<p class="sub-title"><span class="stars" data-score="'+
((__t=(Math.ceil(score)))==null?'':_.escape(__t))+
'"></span><span class="score">'+
((__t=(score))==null?'':_.escape(__t))+
'</span></p>';
 } else { 
__p+='<p class="sub-title nostar">暂无评分</p>';
 } 
__p+='</div><div class="card-ft"><button>详情</button></div></a>';
}
return __p;
},
			'wenda': function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<a class="card wenda" href="'+
((__t=(url))==null?'':_.escape(__t))+
'"><div class="card-hd"></div><div class="card-bd"><p class="title">'+
((__t=(question))==null?'':_.escape(__t))+
'</p>';
 if (participated !== '') { 
__p+='<p class="sub-title"><span style="margin-right: 12px;">头条问答</span>'+
((__t=(participated))==null?'':_.escape(__t))+
'人在参与讨论</p>';
 } 
__p+='</div><div class="card-ft"><button>进入</button></div></a>';
}
return __p;
},
			'forum': function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<a class="card huati" href="'+
((__t=(url))==null?'':_.escape(__t))+
'"><div class="card-hd"><img src="'+
((__t=(image))==null?'':_.escape(__t))+
'"></div><div class="card-bd"><p class="title">#'+
((__t=(title))==null?'':_.escape(__t))+
'#</p><p class="sub-title">'+
((__t=(participated))==null?'':_.escape(__t))+
'人在参与讨论</p></div></a>';
}
return __p;
},
			'stock_change': function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<a class="card gupiao" href="'+
((__t=(url))==null?'':_.escape(__t))+
'"><div class="card-hd"><span class="gupiao-name">'+
((__t=(stock_name))==null?'':_.escape(__t))+
'</span></div><div class="card-bd" color="'+
((__t=( (stock_price==stock_preclose || stock_status == 0 ) ? 'even' : (stock_price > stock_preclose ? 'rise' : 'fall') ))==null?'':_.escape(__t))+
'"><span class="title"><i>'+
((__t=(stock_price))==null?'':_.escape(__t))+
'</i><i>'+
((__t=(change_amount))==null?'':_.escape(__t))+
'</i><i>'+
((__t=(change_scale))==null?'':_.escape(__t))+
'</i></span></div><div class="card-ft" gupiao-state="'+
((__t=(is_portfolio))==null?'':_.escape(__t))+
'"><i>&nbsp;</i>自选</div></a>';
}
return __p;
},
			'live_talk_star': function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<a class="card zhibo star" href="'+
((__t=(url))==null?'':_.escape(__t))+
'"><div class="card-hd"><img src="'+
((__t=(icon))==null?'':_.escape(__t))+
'"></div><div class="card-bd"><p class="title">'+
((__t=(title))==null?'':_.escape(__t))+
'</p><p class="sub-title">'+
((__t=(participated))==null?'':_.escape(__t))+
'人在参与讨论</p></div><div class="card-ft"><button>进入</button></div></a>';
}
return __p;
},
			'live_talk_match': function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<a class="card sport" href="'+
((__t=(url))==null?'':_.escape(__t))+
'"><div class="card-hd"><img src="'+
((__t=(team1_icon))==null?'':_.escape(__t))+
'"><img src="'+
((__t=(team2_icon))==null?'':_.escape(__t))+
'"></div><div class="card-bd"><p class="title">'+
((__t=(title))==null?'':_.escape(__t))+
'</p><p class="sub-title">'+
((__t=(participated))==null?'':_.escape(__t))+
'人在参与讨论</p></div><div class="card-ft"><button>进入</button></div></a>';
}
return __p;
}
		};

		if ('cards' in context && $.isArray(context.cards)) {
			context.cards.forEach(function (card) {
				var cardType = card.type;
				if (cardType in cardTemplateFunctions) {
					var $template = $(cardTemplateFunctions[cardType](card));
					$('footer').prepend($template);
				}
			});
		}
	})();

	/**
	 * 问答导流
	 */
	(function(){
		if ('wenda_recommend' in context) {
			var templateFunction = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<a class="card wenda" href="'+
((__t=(url))==null?'':_.escape(__t))+
'"><div class="card-hd"></div><div class="card-bd"><p class="title">'+
((__t=(question))==null?'':_.escape(__t))+
'</p>';
 if (participated !== '') { 
__p+='<p class="sub-title"><span style="margin-right: 12px;">头条问答</span>'+
((__t=(participated))==null?'':_.escape(__t))+
'人在参与讨论</p>';
 } 
__p+='</div><div class="card-ft"><button>进入</button></div></a>';
}
return __p;
};
			var $template = $(templateFunction({
				url: context.wenda_recommend.open_url,
				question: context.wenda_recommend.text,
				participated: ''
			}));
			$('footer').append($template);
		}
	})();

	/**
	 * 举报突出样式AB测试，包含tag、点赞、赞赏、举报等入口
	 */
	(function(){
		// 只在iOS上做
		if (navigator.userAgent.toLowerCase().indexOf('iphone') === -1) {
			return;
		}

		// 必须要有digg和举报数据
		if (!('feedback' in context) || !('digg' in context)) {
			return;
		}

		context.digg.format_digg_count = formatCount('#', context.digg.digg_count, '赞');
		context.has = {
			rewards: 'rewards' in context,
			concern_words: 'concern_words' in context,
			footnote: 'footnote' in context
		};

		var templateFunction = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='';
 if (has.footnote) { 
__p+='<p class="footnote">'+
((__t=( footnote ))==null?'':_.escape(__t))+
'</p>';
 } 
__p+='';
 if (has.concern_words) { 
__p+='<div class="tags">';
 for (var i = 0; i < concern_words.length; i++) { 
__p+='<a class="tag" data-position="'+
((__t=( (i+1) ))==null?'':_.escape(__t))+
'" href="'+
((__t=( concern_words[i]['link'] ))==null?'':_.escape(__t))+
'">'+
((__t=( concern_words[i]['word'] ))==null?'':_.escape(__t))+
'</a>';
 } 
__p+='</div>';
 } 
__p+='<div class="bottom-buttons '+
((__t=( has.rewards ? '' : 'only-two' ))==null?'':_.escape(__t))+
'">';
 if (has.rewards) {
__p+='<a href="'+
((__t=( rewards.link ))==null?'':_.escape(__t))+
'" class="ib pay"><span><i>&nbsp;</i>'+
((__t=( rewards.word ))==null?'':_.escape(__t))+
'</span></a>';
 } 
__p+='<a id="pgcdigg" href="javascript:;" class="ib like" aniok="true" wenda-state="'+
((__t=( digg.user_digg ? 'digged' : '' ))==null?'':_.escape(__t))+
'"><span><i>&nbsp;</i><span class="b digg-count" realnum="'+
((__t=( digg.digg_count ))==null?'':_.escape(__t))+
'">'+
((__t=( digg.format_digg_count ))==null?'':_.escape(__t))+
'</span></span></a><a href="'+
((__t=( feedback.link ))==null?'':_.escape(__t))+
'" class="ib report"><span><i>&nbsp;</i>'+
((__t=( feedback.word ))==null?'':_.escape(__t))+
'</span></a></div>';
}
return __p;
};
		var $template = $(templateFunction(context));

		$template.on('click', '#pgcdigg', function(ev){
	        if ($(this).attr('wenda-state') === 'digged') {
	            ToutiaoJSBridge.call('toast', {
	                text: '你已经赞过',
	                icon_type: 'icon_error'
	            });
	        } else if (!$(this).hasClass('ajaxing')){
				$(this).addClass('ajaxing');
	            $.ajax({
					type: 'POST',
					url: context.digg.url,
					data: {
						action: context.digg.action,
						aggr_type: context.digg.aggr_type,
						group_id: context.digg.group_id,
						item_id: context.digg.item_id
					},
					dataType: 'json',
					success: function (json) {
						if (json.message === 'success') {
							$('#pgcdigg').attr('wenda-state', 'digged');
			                var currentDiggCount = +$('#pgcdigg').find('.digg-count').attr('realnum');
			                formatCount('.digg-count', currentDiggCount+1, '赞');
							formatCount('.digg-count-special', currentDiggCount+1, '0');
							send_umeng_event('detail', 'like', {
								value: context.digg.group_id,
								extra: {
									item_id: context.digg.item_id
								}
							});
						}
					},
					complete: function () {
						$('#pgcdigg').removeClass('ajaxing');
					}
				})
	        }
		}).on('click', '.tag', function (ev) {
			var keyword = encodeURIComponent($(this).text());
			var position = $(this).data('position');
			send_umeng_event('detail', 'concern_words_click', {
				value: context.digg.group_id,
				extra: {
					item_id: context.digg.item_id,
					keyword: keyword,
					position: position
				}
			});
		}).on('click', '.pay', function (ev) {
			send_umeng_event('detail', 'rewards', {
				value: context.digg.group_id,
				extra: {
					item_id: context.digg.item_id
				}
			});
		}).on('click', '.report', function (ev) {
			send_umeng_event('detail', 'info_report', {
				value: context.digg.group_id,
				extra: {
					item_id: context.digg.item_id
				}
			});
		});

		$('footer').append($template);

		send_exposure_event_once($template.filter('.tags').get(0), function () {
			send_umeng_event('detail', 'concern_words_show', {
				value: context.digg.group_id,
				extra: {
					item_id: context.digg.item_id
				}
			});
		}, true);

		send_exposure_event_once($template.filter('.bottom-buttons').get(0), function () {
			send_umeng_event('detail', 'like_and_rewards_show', {
				value: context.digg.group_id,
				extra: {
					item_id: context.digg.item_id,
					has_rewards: context.has.rewards ? 1 : 0
				}
			});
		}, true);
	})();//*/
};
/*
window.fakecontext = {
  "rewards": {
    "link": "sslocal://webview?url=http%3A%2F%2Fic.snssdk.com%2Fpgcapi%2Fpraise%2Fselect_amount%2F%3Fmedia_id%3D5950581939%26article_id%3D6298560039783236097&title=%E8%B5%9E%E8%B5%8F",
    "word": "赞赏"
  },
  "concern_words": [
    {
      "link": "sslocal://search?from=article_tag&gd_ext_json=%7B%22enter_from%22%3A%22click_related%22%7D&keyword=%23%E5%A8%B1%E4%B9%90%23&extra=%7B%27entra_from%27%3A+%27click_related%27%2C+%27group_id%27%3A+6298555919232925954%7D",
      "word": "娱乐"
    },
    {
      "link": "sslocal://search?from=article_tag&gd_ext_json=%7B%22enter_from%22%3A%22click_related%22%7D&keyword=%23%E5%86%85%E5%9C%B0%E7%BB%BC%E8%89%BA%23&extra=%7B%27entra_from%27%3A+%27click_related%27%2C+%27group_id%27%3A+6298555919232925954%7D",
      "word": "内地综艺"
    },
    {
      "link": "sslocal://search?from=article_tag&gd_ext_json=%7B%22enter_from%22%3A%22click_related%22%7D&keyword=%23%E6%9E%97%E4%BF%8A%E6%9D%B0%23&extra=%7B%27entra_from%27%3A+%27click_related%27%2C+%27group_id%27%3A+6298555919232925954%7D",
      "word": "林俊杰"
    },
    {
      "link": "sslocal://search?from=article_tag&gd_ext_json=%7B%22enter_from%22%3A%22click_related%22%7D&keyword=%23%E6%9D%8E%E5%81%A5%23&extra=%7B%27entra_from%27%3A+%27click_related%27%2C+%27group_id%27%3A+6298555919232925954%7D",
      "word": "李健"
    },
    {
      "link": "sslocal://search?from=article_tag&gd_ext_json=%7B%22enter_from%22%3A%22click_related%22%7D&keyword=%23%E5%A8%B1%E4%B9%90%23&extra=%7B%27entra_from%27%3A+%27click_related%27%2C+%27group_id%27%3A+6298555919232925954%7D",
      "word": "笔记本电脑"
    },
    {
      "link": "sslocal://search?from=article_tag&gd_ext_json=%7B%22enter_from%22%3A%22click_related%22%7D&keyword=%23%E5%86%85%E5%9C%B0%E7%BB%BC%E8%89%BA%23&extra=%7B%27entra_from%27%3A+%27click_related%27%2C+%27group_id%27%3A+6298555919232925954%7D",
      "word": "超级本"
    },
    {
      "link": "sslocal://search?from=article_tag&gd_ext_json=%7B%22enter_from%22%3A%22click_related%22%7D&keyword=%23%E6%9E%97%E4%BF%8A%E6%9D%B0%23&extra=%7B%27entra_from%27%3A+%27click_related%27%2C+%27group_id%27%3A+6298555919232925954%7D",
      "word": "电脑"
    },
    {
      "link": "sslocal://search?from=article_tag&gd_ext_json=%7B%22enter_from%22%3A%22click_related%22%7D&keyword=%23%E6%9D%8E%E5%81%A5%23&extra=%7B%27entra_from%27%3A+%27click_related%27%2C+%27group_id%27%3A+6298555919232925954%7D",
      "word": "MacBook"
    }
  ],
  "tip": "",
  "feedback": {
    "link": "sslocal://webview?url=http%3A%2F%2Fic.snssdk.com%2Ffeedback%2Fwap_list_feedback%2F%3Fsource%3Ddetail_label%26groupid%3D6298555919232925954&hide_more=1&title=%E4%B8%BE%E6%8A%A5%E6%96%87%E7%AB%A0%E9%97%AE%E9%A2%98",
    "word": "举报"
  },
  "digg": {
    "url": "/2/data/item_action/",
    "action": "like",
    "tag": "news_entertainment",
    "item_id": 6298560039783237000,
    "group_id": 6298555919232926000,
    "aggr_type": 1,
	"digg_count": 10,
	"user_digg": 0
  },
  "wenda_recommend": {
    "text": "关注问答频道，聊天更有谈资！",
    "open_url": "sslocal://webview?url=http%3A%2F%2Fic.snssdk.com%2Fwenda%2Fv1%2Fwaphome%2Fbrow%2F%3Frecommend_from%3Drecommend_answer_detail&title=%E5%A4%B4%E6%9D%A1%E9%97%AE%E7%AD%94"
  },
  "cards": [
    {
      "name": "邓紫棋",
      "title": "邓紫棋新专辑直播中",
      "url": "snssdk143://livechat?liveid=6259251226370638084&gd_ext_json={\"enter_from\":\"feed\"}",
      "participated": 80,
      "live_id": 6259251226370638000,
      "type": "live_talk_star",
      "id": 6259251226370638000,
      "icon": ""
    }
  ],
  "series_link": {
    "pre_gid": "6256715822387954177",
    "serial_count": 4,
    "next_gid": "",
    "subject": "http://toutiao.com/m3857951674/?page_type=2&column_no=6276275860811025410"
  },
  "footnote": "文章内容仅供阅读，不构成投资建议，请谨慎对待。投资者据此操作，风险自担。"
}
//*/
;
            contextRenderer(context);
            insertDivCallback();
        } catch (ex) {
            if (window.IS_DEBUGING_WEBIVEW) {
                alert(ex);
            }
        } finally {
            window.infoInserted = true;
        }
    }
}

/**
 * 视频自动播放功能（在首屏或者滚动到屏幕中的第1个视频自动播放，后续视频忽略）
 * @return {undefined}
 */
window.autoplayed = false; //页面第一个视频是否已经自动播放
function videoAutoPlay () {
    var $videos = $('.custom-video');
	if (!autoplayed && $videos.length) {
		var firstVideo = $videos.get(0);
		if (_videoInView(firstVideo)) {
			playVideo(firstVideo, 1);
			autoplayed = true;
		} else {
			document.addEventListener('scroll', videoAutoPlay, false);
		}
	} else {
		document.removeEventListener('scroll', videoAutoPlay, false);
	}
}
;

/**
 * 引入处理逻辑文件
 */
/**
 * 将页面上的音频模板转换为可以播放的audio标签和控制器
 * @return {undefined}
 */
function processAudio () {
    var MusicTemplateFunction = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="musicplayer" play-state="not-playing" id="'+
((__t=(music.id))==null?'':_.escape(__t))+
'"><div class="music-state"><div class="music-info"><span class="music-name">'+
((__t=(music.name))==null?'':_.escape(__t))+
'</span><span class="music-time">'+
((__t=(music.time))==null?'':_.escape(__t))+
'</span></div><div class="music-musician">'+
((__t=(music.musician))==null?'':_.escape(__t))+
'</div></div><div class="progressbar"></div><audio preload="none" src="'+
((__t=(music.src))==null?'':_.escape(__t))+
'" duration="'+
((__t=(music.duration))==null?'':_.escape(__t))+
'"></audio></div>';
}
return __p;
};
    $('tt-audio').each(function (index, dom) {
        var music = {
            id: dom.getAttribute('audio-id'),
            name: dom.getAttribute('title'),
            duration: +dom.getAttribute('time'),
            musician: dom.getAttribute('content'),
            src: dom.getAttribute('src')
        };
        music.time = Math.floor(music.duration / 60) + ':' + (music.duration % 60);

        var $newdom = $(MusicTemplateFunction({music: music}));
        $(dom).replaceWith($newdom);

        $newdom.on('click', function (ev) {
            // FIXME 此处应当增加多音频的互斥逻辑
            //       当页面中存在正在播放的音频时，停止它，播放自己
            var player = $(this).find('audio').get(0);
            if (player.paused) {
                player.play();
                $(this).attr('play-state', 'playing');
            } else {
                player.pause();
                $(this).attr('play-state', 'not-playing');
            }
        }).find('audio').on('timeupdate', function(ev){
            if (this.currentTime >= music.duration) {
                this.pause();
            } else {
                $newdom.find('.progressbar').css('width', this.currentTime/music.duration*100 + '%');
            }
        }).on('durationchange', function(ev){
            // console.info('durationchange', this.duration);
            music.duration = this.duration;
            // TODO 更新time？
        }).on('playing', function(ev){
            $(this).closest('.musicplayer').attr('play-state', 'playing');
        }).on('pause', function(ev){
            this.currentTime = 0;
            $(this).closest('.musicplayer').attr('play-state', 'not-playing');
        });
    });
}

/**
 * 处理问答页内点赞逻辑
 * @return {undefined}
 * @TODO 问题在于如果5.6点踩了，回到5.5上是不展示踩按钮的，此时会展示成功
 */
function processDigg () {
    $('#digg').on('click', function(){
        if ($(this).attr('wenda-state') === 'digged') {
            ToutiaoJSBridge.call('toast', {
                text: '你已经赞过',
                icon_type: 'icon_error'
            });
        } else if ($('#bury').attr('wenda-state') === 'buryed') {
            ToutiaoJSBridge.call('toast', {
                text: '你已经踩过',
                icon_type: 'icon_error'
            });
        } else {
            ToutiaoJSBridge.call('page_state_change', {
                type: 'wenda_digg',
                id: $(this).attr('data-answerid'),
                status: 1 // 1表示将要点赞
            });
        }
    });
    $('#bury').on('click', function(){
        if ($(this).attr('wenda-state') === 'buryed') {
            ToutiaoJSBridge.call('toast', {
                text: '你已经踩过',
                icon_type: 'icon_error'
            });
        } else if ($('#digg').attr('wenda-state') === 'digged') {
            ToutiaoJSBridge.call('toast', {
                text: '你已经赞过',
                icon_type: 'icon_error'
            });
        } else {
            ToutiaoJSBridge.call('page_state_change', {
                type: 'wenda_bury',
                id: $(this).attr('data-answerid'),
                status: 1 // 1表示将要踩
            });
        }
    });
}

/**
 * 处理帖子页内电影评分展示逻辑
 * @return {undefined}
 */
function processFilm () {
    // FIXME 这里对forum_extra直接依赖，不好
    if (window.forum_extra && 'publish_score' in window.forum_extra) {
        var score = window.forum_extra.publish_score;
        var star = Math.ceil(score);
        // TODO 应当写成模板？但考虑只有两个变量用模板是不是重了
        var html = '<div class="film-star-score"><span class="film-star" data-score="' + star + '">&nbsp;</span><span class="film-score">' + score + '</span></div>';
        $('p').eq(0).append(html);
    }
}

/**
 * 处理帖子转发pgc文章显示来源的逻辑
 * @return {undefined}
 */
function processArticleLink () {
    var ArticleLinkTemplateFunction = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='';
 if (article.type == 'video') { 
__p+='<a class="article-link video" href="'+
((__t=(article.link))==null?'':_.escape(__t))+
'">';
 } else { 
__p+='<a class="article-link" href="'+
((__t=(article.link))==null?'':_.escape(__t))+
'">';
 } 
__p+='';
 if (article.cover == '') { 
__p+='<span class="article-cover default"></span>';
 } else { 
__p+='<img src="'+
((__t=(article.cover))==null?'':_.escape(__t))+
'" class="article-cover loading">';
 } 
__p+='<p class="article-title-w"><span class="article-title">'+
((__t=(article.title))==null?'':_.escape(__t))+
'</span></p></a>';
}
return __p;
};
    $('tt-article-link').each(function (index, dom) {
        var article = {
            cover: dom.getAttribute('thumb_url'),
            title: dom.getAttribute('title'),
            link: dom.getAttribute('open_url'),
            type: dom.getAttribute('media_type') == 2 ? 'video' : 'article'
        };
        var $newdom = $(ArticleLinkTemplateFunction({article: article}));
        $(dom).replaceWith($newdom);
    });
}

/**
 * 调整正文中的可搜索关键字链接
 * @return {undefined}
 */
function processProHref () {
    $('[pro-href]').each(function(){
        $(this).attr('href', $(this).attr('pro-href'));
    });
}

/**
 * 监听客户端广播的页面变更状态，更新页面相关元素状态
 * @param  {object} event 事件对象
 * @return {undefined}
 */
function processPageStateChangeEvent (event) {
    switch (event.type) {
        case 'pgc_action':  // PGC订阅头条号
        case 'user_action': // 问答、帖子关注作者
            var $followButton = $('#subscribe');
            var currentPageAuthorId = $followButton.data('authorid');
            if (event.id == currentPageAuthorId) {
                if (event.status == 1) {
                    $followButton.addClass('following').removeClass('disabled');
                } else {
                    $followButton.removeClass('following disabled');
                }
            }
            break;
        case 'wenda_digg': // 问答点赞
            var currentPageAnswerId = $('#digg').attr('data-answerid');
            // NOTE iOS 此处会有运行时bug：点赞可能会再极端情况成功但回传error
            //      故用当前页面状态处理 (event.status == 1)
            if (event.id == currentPageAnswerId && $('#digg').attr('wenda-state') !== 'digged') {
                $('#digg').attr('wenda-state', 'digged');
                var currentDiggCount = +$('#digg').find('.digg-count').attr('realnum');
                formatCount('.digg-count', currentDiggCount+1, '赞');
                formatCount('.digg-count-special', currentDiggCount+1, '0');
            }
            break;
        case 'wenda_bury': // 问答踩
            var currentPageAnswerId = $('#bury').attr('data-answerid');
            if (event.id == currentPageAnswerId && $('#bury').attr('wenda-state') !== 'buryed') {
                $('#bury').attr('wenda-state', 'buryed');
                var currentBuryCount = +$('#bury').find('.bury-count').attr('realnum');
                formatCount('.bury-count',currentBuryCount+1, '踩');
            }
            break;
    }
}

/**
 * 优化正文中的表格交互行为，iOS上开启横滑模式
 * @param {boolean} horizontal_open 是否开启横向滚动
 * @return {undefined}
 * NOTE 安卓不能局部bytedance://disable_swipe，故右滑手势会让整个页面退出
 *      安卓部分系统不触发touchend，不方便实现touchend时swipe.style.opacity = 1
 */
function processTable (horizontal_open) {
    $('table').each(function (index, dom) {
        var $this = $(this);
        if ($this.find('.image').length === 0) {
            $this.addClass('border');
            if (horizontal_open) {
                $this.wrap('<div class="horizontal_scroll"/>');
                var p = $this.parent();
                if ($this.width() > maxWidth) {
                    p.append('<div class="swipe_tip">左滑查看更多</div>');
                    p.bind('touchstart', function(){
                        this.querySelector('.swipe_tip').style.opacity = '0';
                    }).bind('scroll touchend', function(){
                        if (this.scrollLeft == 0) {
                            this.querySelector('.swipe_tip').style.opacity = '1';
                        }
                    });
                }
            }
        }
    });
}

/**
 * 关注事件统计、头像点击统计
 * @return {[type]} [description]
 */
var subscribeTimeoutTimer;
function bindStatisticsEvents () {
    // 关注点击，区分PGC与问答、帖子
    $('#subscribe').on('click', function(){
        var $this = $(this);
        var pageType = $this.data('pagetype');
        var authorId = $this.data('authorid');
        var isFollowing = $this.hasClass('following');

        if ($this.hasClass('disabled')) {
            return;
        }
        $this.addClass('disabled');

        // NOTE iOS 5.5版本时，当无网点击，客户端不会通知页面（预计5.6修复），所以
        //      需要web做一个点击超时的兼容
        subscribeTimeoutTimer = setTimeout(function(){
            $this.removeClass('disabled');
        }, 1e4);

        if (pageType === 'wenda' || pageType === 'forum') {
            ToutiaoJSBridge.call('user_follow_action', {
                id: authorId,
                action: isFollowing ? 'unfollow' : 'dofollow'
            }, function(event){
                clearTimeout(subscribeTimeoutTimer);
                if (event.code == 1) {
                    if (event.status == 1) {
                        $this.removeClass('disabled').addClass('following');
                    } else {
                        $this.removeClass('following disabled');
                    }
                } else {
                    $this.removeClass('disabled');
                }
            });
        } else {
            ToutiaoJSBridge.call(isFollowing ? 'do_media_unlike' : 'do_media_like', {
                id: authorId
            }, function(event){
                clearTimeout(subscribeTimeoutTimer);
                // TODO 这里只是看到了返回就认为成功了，是不是欠妥？
                if (event.code == 1) {
                    if (isFollowing) {
                        $this.removeClass('following disabled');
                        send_umeng_event('preview', 'preview_click_cancel_sub');
                    } else {
                        $this.addClass('following').removeClass('disabled');
                        ToutiaoJSBridge.call('toast', {
                            text: '将增加推荐此头条号内容',
                            icon_type: 'icon_success'
                        });
                        send_umeng_event('preview', 'preview_click_sub');
                    }
                } else {
                    $this.removeClass('disabled');
                }
            });
        }
    });
    // 头像点击
    $('.pgc-link').on('click', function(){
        if (globalArticleObject.article.type === 'forum') {
            send_umeng_event('talk_detail', 'click_ugc_header');
        } else {
            send_umeng_event('detail', 'click_pgc_header', {
                value: h5_extra.media.id,
                extra: {
                    item_id: h5_extra.item_id
                }
            });
        }
    });
    // @deprecated
    $('.profile-link').on('click', function(){
        send_umeng_event('detail', 'click_pgc_card');
    });
}


/********** videos **********/
/**
 * 视频封面图加载成功，调整父节点背景为纯黑
 * @return {undefined}
 */
function appendVideoImg () {
    var parent = this.parentNode;
    if (parent) {
        parent.style.background = '#000';
    }
}

/**
 * 视频封面图加载失败，删除<img>标签
 * @return {undefined}
 */
function errorVideoImg () {
    var parent = this.parentNode;
    if (parent) {
        parent.removeChild(this);
    }
}

/**
 * 显示页面中的视频
 * @return {undefined}
 */
function processCustomVideo () {
    $('.custom-video').each(function (idx, cv) {
        var $cv = $(this);
        var cvw = $cv.data('width') || 0;
        var cvh = $cv.data('height') || 0;
        var cvp = $cv.data('poster') || '';
        var max_ratio = 75; //最大展示height:width比，超过时高度压缩，水平方向左右两侧留黑色背景
        var rel_ratio = 0;
        var ratio = max_ratio;
        var style = '';

        if (cvw && cvh) {
            rel_ratio = (100 * cvh / cvw).toFixed(2);
            if (rel_ratio <= max_ratio) {
                ratio = rel_ratio;
            } else {
                style = 'height: 100%; width: auto;';
            }
        }

        $cv.css('padding-bottom', ratio + '%');
        $cv.html('<img src="' + cvp + '" style="' + style + '" onload="appendVideoImg.call(this)" onerror="errorVideoImg.call(this)" /><i class="custom-video-trigger"></i>');
    }).on('click', function(){
        playVideo(this, 0);
    });
}

/**
 * 告知客户端顶部区域是否显示
 * @param  {object} event 滚动事件
 * @return {undefined}
 */
window.lastHeaderCoordBottom = 0;
function checkHeaderDisplayed (event) {
	var coords = document.getElementsByTagName('header')[0].getBoundingClientRect();
	if (coords.bottom < 0 && lastHeaderCoordBottom >= 0) {
		// 消失在屏幕外
		ToutiaoJSBridge.call('showTitleBarPgcLayout', {
			show: true
		});
	} else if (coords.bottom >= 0 && lastHeaderCoordBottom < 0) {
		ToutiaoJSBridge.call('showTitleBarPgcLayout', {
			show: false
		});
	}
	lastHeaderCoordBottom = coords.bottom;
}
;

/**
* 调整图片容器的尺寸外观（展示大小、是否显示gif标志），仅仅是图片容器，而真正的<img>由客户端调用appendLocalImage填充
* @param {boolean} rotate 表明当前调整是否来源于横竖屏切换，横竖切换时，只调整图片尺寸，其他已设属性保持不变
* @param {string} type 图片类型，origin/thumb/none
* @param {number} index 图片索引0~n，默认是处理所有图片
*/
function show_holder(rotate, type, index) {
	var theHolders = holders;

	if (typeof index == "number") {
        theHolders = holders.eq(index);
    }

    for (var i = 0, len = theHolders.length; i < len; i++) {
        var t 		= theHolders.eq(i),
        	mime 	= t.attr("type"),
        	h 		= 0,
        	w 		= 0;

        if(rotate){
        	//ipad横竖屏切换时，t.attr('state')已设置
        	type = t.attr('state');
        }

        if( "thumb" == type ) {
            w = t.attr("thumb_width");
            h = t.attr("thumb_height");
            if(!w){ //避免服务端下发图片宽度异常，下同
            	w = 200;
            }
            if(!h){
            	h = 200;
            }
        } else {
        	//无图和大图共用大图的尺寸进行展示，但无图有差异化微调
            w = t.attr("width");
            h = t.attr("height");

            var _wh = adjust_origin_scale(w, h);
            w = _wh.w;
            h = _wh.h;

           	if( 'none' == type ){
            	//无图模式，图片高度控制，避免无图状态高度超过一屏
	            h = Math.min(h, winHeight * 0.8);
            }
        }

        //设置当前图片模式下图片展示大小
        t.css({
			'width': w + "px",
			'height': h + "px"
        });

        //横竖屏切换时，只调整图片容器的尺寸，不进行以下逻辑
       	if( !rotate ){
            switch(type){
            	case 'thumb':
            		'gif' == mime && addGifLabel(t);
            		break;
            	case 'origin':
            		//origin模式下，gif图不一定能自动播放，由show_large_gif_icon控制是否需要添加gif图标
            		if( 'gif' == mime ){
            			show_large_gif_icon ? addGifLabel(t) : removeGifLabel(t);
            		}
            		break;
            	case 'none':
            		//极省流量模式的无图状态，如果是gif图，显示gif图标
            		if( 'gif' == mime ){
            			addGifLabel(t);
            		}
            	default:
            		//nothing todo
            }

	        //对于未提供index参数的情形，表示全文所有图片容器的初始化，为其编制索引，设置图片模式类
	        if (typeof index === 'undefined') {
	            t.attr("index", i).addClass(type).attr('loaded',0);
	        }else{
	        	//显式提供了index，表示单张图片模式发生改变，需重置图片模式类
	        	t.removeClass('origin thumb none').addClass(type);
	        }

	        //设置图片当前模式，便于减少后续计算量
	        t.attr('state', type);
    	}
    }
}

/**
* 调整图片在大图模式下的尺寸（超过正文宽度的一半就用正文宽度代替）
* @param {number} origin_w 图片容器原始宽度
* @param {number} origin_h 图片容器原始高度
*/
function adjust_origin_scale(origin_w, origin_h){
	if(!origin_w){
		origin_w = 200;
	}
	var w1 = origin_w,
		h1 = 0;

	if(w1 > 0.5 * maxWidth){
		w1 = maxWidth;
	}

	h1 = parseInt(origin_h * w1 / origin_w);
	if (!h1) {
		h1 = 200;
	}

	return { "w" : w1, "h" : h1 };
}

/**
* 往图片容器中添加真正的<img>图片，并根据图片类型重新调整图片容器 —— 由客户端调用
* 客户端获取图片成功后才调用此接口，所以前端不需要考虑img的onerror事件
* @param {number} index 图片索引，如0/1/2...
* @param {string} url 图片src
* @param {string} type 图片类型，origin/thumb，此处无none值
*/
function appendLocalImage(index, url, type) {
	var holder 	= holders.eq(index),
		img 	= holder.children('img'),
		state 	= holder.attr('state');

	if(img.length){
		//小图-->大图，替换src
		img.attr('src', url);
	}else{
		//尚无图片，show_holder阶段可能在holder中插入了gif图标元素，这里不能holder.html('<img>')
		var _img = document.createElement('img');
		_img.src = url;
		holder.prepend(_img);
		holder.css("background", "none").attr('loaded',1);
	}
	//小图-->大图，或无图-->有图都可出现spinner
	removeLoadingSpinner(holder);

	//如果客户端返回的真正图片模式和页面初始化时图片模式不一致，需要重新设置图片容器
	//否则，保持初始化设置不变，避免重复计算
	if(type !== state){
		show_holder(false, type, index);
	}

	if(type == 'origin'){
		loaded_origin ++;
		if(img_type != 'origin' && loaded_origin == holders_len){
			var btn = document.querySelector('.toggle-img-con');
			if(btn){
				btn.style.visibility='hidden';
			}
		}
	}
}

/**
* 图片小/大/全屏图切换、视频播放、PGC统计等点击事件
*/
function bind_click_events() {
    //图片点击事件
    holders.on("tap", function(e) {
       	var $this = $(this),
	    	state = $this.attr('state'),
	       	index = $this.attr("index"),
	       	is_loading = $this.find(".spinner").length ? 1 : 0,
	       	is_gif = $this.attr("type") == 'gif',
	       	has_image = $this.find('img').length,
	       	_href = $this.attr("href") || '',
	       	is_link = /^http(s)?:\/\//i.test(_href);

       	if (is_loading) {
       		//正在加载中的图片，再次点击时，中断加载
       		send_request('cancel_image', {'index': index});
       		if(is_gif){ addGifLabel($this); }
       		removeLoadingSpinner($this);
       	}else{
       		var view_type = "full";//幻灯片浏览模式
       		if ("thumb" == state || "none" == state) {
       			view_type = "origin";
       			addLoadingSpinner($this, has_image);

       			if(is_gif){
       				removeGifLabel($this);
       			}else if("thumb" == state){
       				//非gif的小图在切换大图之前，附加动效class
       				$this.addClass('animation');
       			}
       		}

			//如果图片链接以http开头，不抛大图事件
			if( !is_link ){
				if(is_gif){
					//iOS中gif的一些特殊控制策略
					switch(gif_play_in_native){
						case 0 :
							if("full" != view_type){
								send_request(view_type + "_image", {'index': index});
							}
							break;
						case 1 :
							if("full" == view_type){
								//从origin图模式点击加载full_image
								send_request(view_type + "_image", {'index': index});
							}
							break;
						case 2 :
							send_request("full_image", {'index': index});
							//此状态对应以下两种情形，此时不需要为gif图片增加addLoadingSpinner、removeGifLabel操作。
							//1，从thumb/none图模式直接跳变到full_image全屏模式；
							//2，origin图模式到full_image模式，且origin图需要show_large_gif_icon
							if("origin" == view_type || show_large_gif_icon){
								removeLoadingSpinner($this);
								addGifLabel($this);
							}
							break;
						default:
							send_request(view_type + "_image", {'index': index});
					}
				}else{
					if("origin" == view_type){
						send_request(view_type + "_image", {'index': index});
					}else{
						//进入幻灯片浏览之前，获取图片当前坐标信息，通知客户端实现动画效果
						var _coords = $this.offset(),
							_top = _coords.top,
							_left = _coords.left,
							_width = _coords.width || $this.attr("width"),
							_height = _coords.height || $this.attr("height");

						send_request(view_type + "_image", {'index': index, 'left' : _left, 'top' : _top, 'width' : _width, 'height' : _height});
					}
				}
			}
       	}

       	//如果href非http://形式，则禁止进一步动作，否则允许默认的链接跳转行为
	   	return is_link;
	});
}

/**
* 添加图片加载中提示
* @param {object} $con 父节点
* @param {boolean} has_image 父节点是否已经包含有效图片
*/
function addLoadingSpinner($con, has_image) {
    var spinner = $("<i class='spinner rotate'/>");
    if (!has_image) {
    	//页面初始化阶段：无图模式无背景logo，点击时增加背景logo展示
        $con.addClass('bg_logo');

    	//无图且loading时候，spinner小图标会覆盖父节点背景图片的文字，下移spinner图标
        spinner.addClass("spinner_bg");
    };
    $con.append(spinner);
}

/**
* 去除图片加载中提示
* @param {object} $con 父节点
*/
function removeLoadingSpinner($con) {
    $con.removeClass("bg_logo").find(".spinner").remove();
}

/**
* 添加gif图标
* @param {object} $con 父节点
*/
function addGifLabel($con) {
	var has_gificon = $con.find(".gif_play").length;
	if(!has_gificon){
    	$con.append("<i class='gif_play'></i>");
    }
}

/**
* 去除gif图标
* @param {object} $con 父节点
*/
function removeGifLabel($con) {
    $con.find(".gif_play").remove();
}

/**
* 判断图片是否处于屏幕可视区域，在屏幕以下offset处即触发懒加载，与视频的判断差别
* @param {object} element 图片容器DOM
*/
function _inView(element) {
    var coords = element.getBoundingClientRect();
    if(coords.top < 0){
        return true;
    }else{
        return ((coords.top >= 0 && coords.left >= 0 && coords.top) <= winHeight + offset);
    }
}

/**
* 图片懒加载-显示符合条件的图片
*/
function _pollImages() {
	if( ! window.ToutiaoJSBridge ) return;

    var unloaded = holders.filter('[loaded="0"]'),
    	num = unloaded.length,
    	_img_type = img_type + '_image';

    if (num > 0) {
        for (var i = 0; i < num; i++) {
        	var self = unloaded[i],
        		is_inview = _inView( self );
            if ( is_inview ) {
            	ToutiaoJSBridge.call("loadDetailImage", {type : _img_type, index: self.getAttribute('index')}, null);
            }else{
            	//图片是从上到下顺序检测的，如果某个图片不能触发懒加载，其下面的都没有必要再检测了，等待下一次Scroll时候检测
            	break;
            }
        }
    } else {
        document.removeEventListener('scroll', _pollImages, false);
    }
}

	/**
	* 处理正文图片，根据hash中tt_image类型确定向客户端发送图片加载请求
	* 客户端可根据本地图片缓存情况返回真是的图片类型，不一定和tt_image类型相同
	* tt_image !== 'origin',则在第一个<a class="image">前插入“切换大图模式按钮”
	*/
	function showImage (type) {

	    show_holder(false, type);

	    if( holders_len ){
	    	//如果非origin，提供一键加载origin图按钮
		    if(type !== 'origin'){
		    	var first_image = holders.eq(0),
		    		toggle_node = document.createElement('div');

		    	toggle_node.className = 'toggle-img-con';
		    	toggle_node.innerHTML = '<a class="toggle-img" id="toggle-img" href="javascript:;" tt-press>显示大图</a>';

		    	first_image.before( toggle_node );

		    	toggle_node = $(toggle_node);
	    		toggle_node.one('tap','#toggle-img',function(){
	    			if('none' == type){
						holders.removeClass(type);
					}
					img_type = "origin";//一键显示大图时，覆盖location.hash中的图片类型
					toggle_node.css('visibility','hidden');

					send_request('toggle_image');
	    		});
		    }

	    	//当页面图片个数超过10幅时，强制打开懒加载，保持和android类似逻辑
	    	if(!lazy_load && holders_len > 10 && type !== 'none'){
	    		lazy_load = true;
	    	}

		    //type==none 无图模式，不进行lazyload。此处避免客户端在none类型下发lazy_load指令，加层保护
		    if (lazy_load && type !== 'none' ) {
		        _pollImages(); //处理首屏图片
		        document.addEventListener("scroll", _pollImages, false);
		    } else {
		        //由客户端内部根据网络情况区分需要加载什么样的图片，前端只需要把“全部加载”这个指示告诉客户端
		        window.ToutiaoJSBridge && ToutiaoJSBridge.call("loadDetailImage", {'type' : 'all'}, null);
		    }
		}
	}
/****************************************************************
 * 视频处理逻辑
 ****************************************************************/
/**
 * 调用客户端播放器进行视频播放
 * @param {object} video 视频容器<div class="custom-video">
 * @param {number} status 区分是用户点击视频，还是视频自动播放，其中 0 代表点击播放，1 代表自动播放
 */
function playVideo (video, status) {
	var coords = video.getBoundingClientRect();
	window.ToutiaoJSBridge.call('playNativeVideo',{
		sp: video.getAttribute('data-sp'),
		vid: video.getAttribute('data-vid'),
		frame: [coords.left, video.offsetTop, coords.width, coords.height],
		status: status
	}, null);
}
/****************************************************************
 * 初始化页面入口
 *****************************************************************/
/**
 * 全局变量
 */
var maxWidth;
var winHeight; // 控制无图模式下图片容器高度不超过一屏/懒加载等
var holders;
var holders_len;
var loaded_origin = 0; // 在小图/无图模式下，跟踪已加载出origin大图的个数，方便控制“显示大图”按钮的隐现
var img_type; // 图片展示类型，默认小图
var offset; // 懒加载threshold
var lazy_load; // 懒加载开关
var gif_play_in_native; // 客户端gif播放控制
var show_large_gif_icon; // 客户端gif播放控制

function initCustomStyle () {
	var font_size = hash('tt_font') || 'm';       // 字体大小
	var day_mode  = hash('tt_daymode') || 1;    // 日夜间模式

	setFontSize(font_size);
	setDayMode(day_mode);
}

function initPage () {
	// NOTE 前端消除掉iOS加载3次js问题
	//      为什么android没有这个逻辑？
	if ($('body').attr('inited')) {
		return false;
	}
	$('body').attr('inited', 1);

	maxWidth = $('article').width() || 320;
	winHeight = window.innerHeight || document.documentElement.clientHeight;
	holders = $('.image');
	holders_len = holders.length;
	offset = parseInt(getMeta('offset_height')) || 100;
	lazy_load = parseInt(getMeta('lazy_load')) || 0;
	gif_play_in_native = parseInt(getMeta('gif_play_in_native')) || 0;
	show_large_gif_icon = parseInt(getMeta('show_large_gif_icon')) || 0;
	img_type  = hash('tt_image') || 'thumb';

	initCustomStyle();

    showImage(img_type);
    bind_click_events();

/* 以下部分两端已经统一逻辑 */
	bindStatisticsEvents();
	processCustomVideo();
	processTable();
	processAudio();
	processDigg();
	processFilm();
	processArticleLink();
	processProHref();

	setTimeout( function () {
		// iPhone上的UIWebView对scroll事件支持很差，但考虑简化逻辑，此处仍保留scroll事件
		document.addEventListener('scroll', checkHeaderDisplayed, false);
	}, 100);

	window.ToutiaoJSBridge.on('page_state_change', processPageStateChangeEvent);

	//服务端information接口先于此脚本加载完毕时，服务端提供videoAutoPlayCallback供当前脚本加载完毕后调用，保险措施
	if (typeof videoAutoPlayCallback == 'function') {
		videoAutoPlayCallback();
	}

	//服务端information接口先于此脚本加载完毕时，服务端提供updateAppreciateCountByServerCallback供当前脚本加载完毕后调用，保险措施
	if (typeof updateAppreciateCountByServerCallback == 'function') {
		updateAppreciateCountByServerCallback();
	}
/* 以上部分两端已经统一逻辑 */

	// 通知客户端domReady
	// NOTE 客户端内很多逻辑依赖此消息
	setTimeout(function () {
		location.href = "bytedance://domReady";
		// TODO 可以在domready的时候发送一些消息供客户端使用
		// 客户端也可以在此时通知前端数据（如context）或执行方法
		// ToutiaoJSBridge.call('domready', {
		//
		// }, function (data) {
		//
		// });
	}, 0);
}
document.addEventListener("DOMContentLoaded", initPage, false);
/**
 * 针对ipad版本增加横、竖屏切换，以及“分屏”操作，窗口尺寸变化时图片显示调整
 */
window.onresize = function () {
	maxWidth = $('article').width();
	show_holder(true);
};
/****************************************************************
 * android端对webview内容高度的获取方法，真是造孽啊！
 *****************************************************************/
// iOS 留空先
function insertDivCallback () {

}
