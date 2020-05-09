import React, { Fragment, useEffect } from 'react'
import pretty from "pretty"
import Meta from "./meta"
import SideBar from "../layouts/sidebar"
import TopGood from "../components/topGood"
import ReplyReply from "../components/replyReply"
import "../theme/less/index.less"

const TopicIndex = (props) => {
	console.log("TopicIndex props", props)
	const {data: { topic, no_reply_topics, tops, tab, is_collect, csrf, author_other_topics }, locals: { current_user }, user} = props

	useEffect(() => {

		if((current_user && typeof(topic) !== 'undefined')){
			const urls = ['/public/libs/editor/editor.js', '/public/libs/webuploader/webuploader.withoutimage.js', '/public/libs/editor/ext.js']
			syncLoadScripts(urls, () => {
				$(document).ready(function () {
					// 获取所有回复者name
					var allNames = $('.reply_author').map(function (idx, ele) {
						return $(ele).text().trim();
					}).toArray();
					allNames.push($('.user_card .user_name').text())
					allNames = _.uniq(allNames);
					// END 获取所有回复者name

					// 编辑器相关
					$('textarea.editor').each(function(){
						var editor = new Editor({
							status: []
						});
						var $el = $(this);

						editor.render(this);
						//绑定editor
						$(this).data('editor', editor);

						var $input = $(editor.codemirror.display.input);
						$input.keydown(function(event){
							if (event.keyCode === 13 && (event.ctrlKey || event.metaKey)) {
								event.preventDefault();
								$el.closest('form').submit();
							}
						});

						// at.js 配置
						var codeMirrorGoLineUp = CodeMirror.commands.goLineUp;
						var codeMirrorGoLineDown = CodeMirror.commands.goLineDown;
						var codeMirrorNewlineAndIndent = CodeMirror.commands.newlineAndIndent;
						$input.atwho({
							at: '@',
							data: allNames
						})
						.on('shown.atwho', function () {
							CodeMirror.commands.goLineUp = _.noop;
							CodeMirror.commands.goLineDown = _.noop;
							CodeMirror.commands.newlineAndIndent = _.noop;
						})
						.on('hidden.atwho', function () {
							CodeMirror.commands.goLineUp = codeMirrorGoLineUp;
							CodeMirror.commands.goLineDown = codeMirrorGoLineDown;
							CodeMirror.commands.newlineAndIndent = codeMirrorNewlineAndIndent;
						});
						// END at.js 配置

					});
					// END 编辑器相关

					// 评论回复
					$('#content').on('click', '.reply2_btn', function (event) {
						var $btn = $(event.currentTarget);
						var parent = $btn.closest('.reply_area');
						var editorWrap = parent.find('.reply2_form');
						parent.find('.reply2_area').prepend(editorWrap);
						var textarea = editorWrap.find('textarea.editor');
						var user = $btn.closest('.author_content').find('.reply_author').text().trim();
						var editor = textarea.data('editor');
						editorWrap.show('fast', function () {
							var cm = editor.codemirror;
							cm.focus();
							if(cm.getValue().indexOf('@' + user) < 0){
								editor.push('@' + user + ' ');
							}
						});
					});

					$('#content').on('click', '.reply2_at_btn', function (event) {
						var $btn = $(event.currentTarget);
						var editorWrap = $btn.closest('.reply2_area').find('.reply2_form');
						$btn.closest('.reply2_item').after(editorWrap);
						var textarea = editorWrap.find('textarea.editor');
						var user = $btn.closest('.reply2_item').find('.reply_author').text().trim();
						var editor = textarea.data('editor');
						editorWrap.show('fast', function () {
							var cm = editor.codemirror;
							cm.focus();
							if(cm.getValue().indexOf('@' + user) < 0){
								editor.push('@' + user + ' ');
							}
						});
					});
					// END 评论回复

					// 加入收藏
					$('.collect_btn').click(function () {
						var $me = $(this);
						var action = $me.attr('action');
						var data = {
							topic_id: topic._id,
							_csrf: csrf
						};
						var $countSpan = $('.collect-topic-count');
						$.post('/topic/' + action, data, function (data) {
							if (data.status === 'success') {
								if (action == 'collect') {
									$me.val('取消收藏');
									$me.attr('action', 'de_collect');
								} else {
									$me.val('收藏');
									$me.attr('action', 'collect');
								}
								$me.toggleClass('span-success');
							}
						}, 'json');
					});
					// END 加入收藏

					// 删除回复
					$('#content').on('click', '.delete_reply_btn, .delete_reply2_btn', function (event) {
						var $me = $(event.currentTarget);
						if (confirm('确定要删除此回复吗？')) {
							var reply_id = null;
							if ($me.hasClass('delete_reply_btn')) {
								reply_id = $me.closest('.reply_item').attr('reply_id');
							}
							if ($me.hasClass('delete_reply2_btn')) {
								reply_id = $me.closest('.reply2_item').attr('reply_id');
							}
							var data = {
								reply_id: reply_id,
								_csrf: csrf
							};
							$.post('/reply/' + reply_id + '/delete', data, function (data) {
								if (data.status === 'success') {
									if ($me.hasClass('delete_reply_btn')) {
										$me.closest('.reply_item').remove();
									}
									if ($me.hasClass('delete_reply2_btn')) {
										$me.closest('.reply2_item').remove();
									}
								}
							}, 'json');
						}
						return false;
					});
					// END 删除回复

					// 删除话题
					$('.delete_topic_btn').click(function () {
						var topicId = $(this).data('id');
						if (topicId && confirm('确定要删除此话题吗？')) {
							$.post('/topic/' + topicId + '/delete', { _csrf: $('#_csrf').val() }, function (result) {
								if (!result.success) {
									alert(result.message);
								} else {
									location.href = '/';
								}
							});
						}
						return false;
					});
					// END 删除话题

					// 用户 hover 在回复框时才显示点赞按钮
					$('.reply_area').hover(
						function () {
							$(this).find('.up_btn').removeClass('invisible');
						},
						function () {
							var $this = $(this);
							if ($this.find('.up-count').text().trim() === '') {
								$this.find('.up_btn').addClass('invisible');
							}
						});
					// END 用户 hover 在回复框时才显示点赞按钮
				});
			})
		}

		(function(){
			var timer = null; //对话框延时定时器
			// 初始化 $('.replies_history')
			var $repliesHistory = $('.replies_history');
			var $repliesHistoryContent = $repliesHistory.find('.inner_content');
			$repliesHistory.hide();
			// END
			// 鼠标移入对话框清除隐藏定时器；移出时隐藏对话框
			$repliesHistory.on('mouseenter', function(){
				clearTimeout(timer);
			}).on('mouseleave', function(){
				$repliesHistory.fadeOut('fast');
			});
			// 显示被 at 用户的本页评论
			if ($('.reply2_item').length === 0) {
				// 只在流式评论布局中使用

				$('#content').on('mouseenter', '.reply_content a', function (e) {
					clearTimeout(timer);
					var $this = $(this);
					if ($this.text()[0] === '@') {
						var thisText = $this.text().trim();
						var loginname = thisText.slice(1);
						var offset = $this.offset();
						var width = $this.width();
						var mainOffset = $('#main').offset();
						$repliesHistory.css('left', offset.left-mainOffset.left+width+10); // magic number
						$repliesHistory.css('top', offset.top-mainOffset.top-10); // magic number
						$repliesHistory.css({
							'z-index': 1,
						});
						$repliesHistoryContent.empty();
						var chats = [];
						var replyToId = $this.closest('.reply_item').attr('reply_to_id');
						while (replyToId) {
							var $replyItem = $('.reply_item[reply_id=' + replyToId + ']');
							var replyContent = $replyItem.find('.reply_content').text().trim();
							if (replyContent.length > 0) {
								chats.push([
									$($replyItem.find('.user_avatar').html()).attr({
										height: '30px',
										width: '30px',
									}), // avatar
									(replyContent.length>300?replyContent.substr(0,300)+'...':replyContent), // reply content
									'<a href="#'+replyToId+'" class="scroll_to_original" title="查看原文">↑</a>'
								]);
							}
							replyToId = $replyItem.attr('reply_to_id');
						}
						if(chats.length > 0) {
							chats.reverse();

							$repliesHistoryContent.append('<div class="title">查看对话</div>');
							chats.forEach(function (pair, idx) {
								var $chat = $repliesHistoryContent.append('<div class="item"></div>');
								$chat.append(pair[0]); // 头像
								$chat.append($('<span>').text(pair[1])); // 内容
								$chat.append(pair[2]); // 查看原文 anchor
							});
							$repliesHistory.fadeIn('fast');
						}else{
							$repliesHistory.hide();
						}
					}
				}).on('mouseleave', '.reply_content a', function (e) {
					timer = setTimeout(function(){
						$repliesHistory.fadeOut('fast');
					}, 500);
				});
			}
			// END 显示被 at 用户的本页评论
		})();

		// 点赞
		$('.up_btn').click(function (e) {
			var $this = $(this);
			var replyId = $this.closest('.reply_area').attr('reply_id');
			$.ajax({
				url: '/reply/' + replyId + '/up',
				method: 'POST',
			}).done(function (data) {
				if (data.success) {
					$this.removeClass('invisible');
					var currentCount = Number($this.next('.up-count').text().trim()) || 0;
					if (data.action === 'up') {
						$this.next('.up-count').text(currentCount + 1);
						$this.addClass('uped');
					} else {
						if (data.action === 'down') {
							$this.next('.up-count').text(currentCount - 1);
							$this.removeClass('uped');
						}
					}
				} else {
					alert(data.message);
				}
			}).fail(function (xhr) {
				if (xhr.status === 403) {
					alert('请先登录，登陆后即可点赞。');
				}
			});
		});
		// END 点赞
		// 图片预览
		(function(){
			var $previewModal = $('#preview-modal');
			var $previewImage = $('#preview-image');
			var $body = $('body'); // cache

			$(document).on('click', '.markdown-text img', function(e) {
				var $img = $(this);
				// 图片被a标签包裹时，不显示弹层
				if ($img.parent('a').length > 0) {
					return;
				}
				showModal($img.attr('src'));
			});

			$previewModal.on('click', hideModal);

			$previewModal.on('hidden.bs.modal', function() {
				// 在预览框消失之后恢复 body 的滚动能力
				$body.css('overflow-y', 'scroll');
			})

			$previewModal.on('shown.bs.modal', function() {
				// 修复上次滚动留下的痕迹,可能会导致短暂的闪烁，不过可以接受
				// TODO: to be promote
				$previewModal.scrollTop(0);
			})

			function showModal(src) {
				$previewImage.attr('src', src);
				$previewModal.modal('show');
				// 禁止 body 滚动
				$body.css('overflow-y', 'hidden');
			}

			function hideModal() {
				$previewModal.modal('hide');
			}

		})()
		// END 图片预览
	}, [])

	return(
		<div id="main">
			<Meta topic={topic} />
			<div id='content'>
  			<div className='panel'>
    			<div className='header topic_header'>
      			<span className="topic_full_title">
							<TopGood topic={topic} tab={tab} />
							{topic.title}
						</span>
      			<div className="changes">
        			<span>发布于 {topic.create_at}</span>
        			<span> 作者 <a href={`/user/${topic.author.loginname}`}>{topic.author.loginname } </a></span>
        			<span> {topic.visit_count} 次浏览 </span>
							{ (topic.create_at != topic.update_at) && <span>{topic.update_at}</span> }
							{ (topic.tab) && <span> 来自 {topic.tabName}</span>}
							{ current_user && <input
								className={`span-common ${is_collect ? '' : 'span-success'} pull-right collect_btn`}
								type="submit"
								value={is_collect ? '取消收藏' : '收藏'}
								action={is_collect ? 'de_collect' : 'collect'}></input> }
						</div>
						{
							current_user
							? <div id="manage_topic">
									{
										(current_user.is_admin)
										&&	<Fragment>
													<a href={`/topic/${topic._id}/top`} data-method="post">
														{ (topic.top) ? <i className="fa fa-lg fa-star-o" title='取消置顶'></i> : <i className="fa fa-lg fa-star" title='置顶'></i> }
													</a>
													<a href={`/topic/${topic._id}/good`} data-method="post">
														{ (topic.good) ? <i className="fa fa-lg fa-heart-o" title="取消精华"></i> : <i className="fa fa-lg fa-heart" title="加精华"></i> }
													</a>
													<a href={`/topic/${topic._id}/lock`} data-method="post">
														{ (topic.lock) ? <i className="fa fa-lg fa-unlock" title='取消锁定'></i> : <i className="fa fa-lg fa-lock" title='锁定（不可再回复）'></i> }
													</a>
													<a href={`/topic/${topic._id}/edit`}><i className="fa fa-lg fa-pencil-square-o" title='编辑'></i></a>
													<a href='javascript:;' data-id={topic._id} className='delete_topic_btn'><i className="fa fa-lg fa-trash" title='删除'></i></a>
												</Fragment>
									}
								</div>
							:	(current_user && current_user._id  && (current_user._id === topic.author_id))
							?	<Fragment>
									<a href={`/topic/${topic._id}/edit`}><i className="fa fa-lg fa-pencil-square-o" title='编辑'></i></a>
									<a href='javascript:;' data-id={topic._id} className='delete_topic_btn'><i className="fa fa-lg fa-trash" title='删除'></i></a>
								</Fragment>
							:	null
						}
      		</div>
					<div className='inner topic'>
      			<div className='topic_content' dangerouslySetInnerHTML={{__html: pretty(topic.content)}}></div>
    			</div>
    		</div>
				{
					(topic.replies && topic.replies.length > 0)
					&& <div className='panel'>
							<div className='header'>
								<span className='col_fade'>{topic.replies.length} 回复</span>
							</div>
							{ topic.replies.map((reply, index) => <ReplyReply key={index} reply={reply} topic={topic} indexInCollection={index} current_user={current_user} />) }
						</div>
				}
				{
					(current_user && typeof(topic) !== 'undefined')
					?	<Fragment>
							<div className='panel'>
								<div className='header'>
									<span className='col_fade'>添加回复</span>
								</div>
								<div className='inner reply'>
									<form id='reply_form' action={`/${topic._id.slice(1, -1)}/reply`} method='post'>
										<div className='markdown_editor in_editor'>
											<div className='markdown_in_editor'>
												<textarea className='editor' name='r_content' rows='8'></textarea>
												<div className='editor_buttons'>
													<input className='span-primary submit_btn' type="submit"
														data-loading-text="回复中.."
														value={`回复${topic.lock ? '(此主题已锁定)' : ''}`}
														disabled={topic.lock ? "disabled" : ""}
													/>
												</div>
											</div>
										</div>
										<input type='hidden' name='_csrf' id="_csrf" value={csrf} />
									</form>
								</div>
							</div>
						</Fragment>
						: null
				}
				<div className="replies_history">
				  <div className="inner_content"></div>
				  {/* <div className="anchor"></div> */}
				</div>
				<div className="modal fade" id="preview-modal">
				  <div className="modal-body" style={{"maxHeight": "initial"}}>
				    <img src="" alt="点击内容或者外部自动关闭图片预览" id="preview-image" />
				  </div>
				</div>
  		</div>
			<SideBar user={user} current_user={current_user} no_reply_topics={no_reply_topics} tops={tops} author_other_topics={author_other_topics} need_author_other_topic={true} />
		</div>
	)
}

TopicIndex.getInitialProps = ({ req, res }) => {
	if (req) {
		return {
			data: res ? res.data : null,
			locals: res ? res.locals : null,
			user: req.user,
		};
	}
}

export default TopicIndex
