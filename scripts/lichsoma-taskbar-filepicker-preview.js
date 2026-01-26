// LichSOMA's Taskbar - FilePicker Media Preview

// FilePicker 렌더링 시 미디어 프리뷰 버튼 추가
Hooks.on("renderFilePicker", (app, html, data) => {
  const jQueryHtml = $(html);

  let fileList = jQueryHtml.find("ol.file-list li.file");

  if (fileList.length === 0) {
    const fallbackFileList = jQueryHtml.find(".file");
    if (fallbackFileList.length > 0) {
      fileList = fallbackFileList;
    }
  }

  fileList.each((index, element) => {
    const $element = $(element);
    
    // 파일 경로 가져오기 (여러 방법 시도)
    let filePath = $element.data("path");
    if (!filePath) {
      // data-path 속성이 없으면 다른 방법 시도
      const pathAttr = $element.attr("data-path");
      if (pathAttr) filePath = pathAttr;
    }
    if (!filePath) {
      // 파일 이름에서 경로 추출 시도
      const fileName = $element.find(".file-name").text() || $element.text();
      if (fileName) {
        // 현재 디렉토리 경로와 파일 이름 조합
        const currentPath = app.activeSource || "";
        filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      }
    }

    if (!filePath) return;

    const fileExtension = filePath.split(".").pop().toLowerCase();

    // 파일 타입 확인
    const isVideo = ["mp4", "webm", "oggv", "ogv"].includes(fileExtension);
    const isAudio = ["mp3", "wav", "flac", "ogg", "oga", "opus"].includes(fileExtension);
    const isImage = ["jpg", "jpeg", "png", "webp", "svg", "gif"].includes(fileExtension);

    if (isVideo || isAudio || isImage) {
      // 이미 프리뷰 버튼이 있으면 스킵
      if ($element.find(".media-preview-button").length > 0) return;

      // 이미지와 다른 미디어 타입에 따라 다른 아이콘 사용
      const iconClass = isImage ? "fa-eye" : "fa-play-circle";
      const buttonClass = isImage ? "media-preview-button imagePreviewButton" : "media-preview-button";

      const previewButton = $(
        `<a class="${buttonClass}"><i class="fas ${iconClass}"></i></a>`
      );

      // 호버 이벤트로 프리뷰 표시
      let hoverTimeout;
      let hideTimeout;

      previewButton.on("mouseenter", (event) => {
        event.stopPropagation();
        
        // 기존 숨김 타임아웃 취소
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
        
        // 약간의 지연 후 프리뷰 표시 (의도하지 않은 호버 방지)
        hoverTimeout = setTimeout(() => {
          // 타입 결정
          let type = "audio";
          if (isVideo) type = "video";
          if (isImage) type = "image";

          // 버튼의 위치 가져오기
          const buttonRect = previewButton[0].getBoundingClientRect();
          createPreview(filePath, type, buttonRect);
        }, 300); // 300ms 지연
      });

      previewButton.on("mouseleave", (event) => {
        event.stopPropagation();
        
        // 호버 취소 시 타임아웃 클리어
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          hoverTimeout = null;
        }
        
        // 버튼에서 마우스가 떨어지면 바로 프리뷰 제거
        $(".media-preview-player").remove();
      });

      $element.append(previewButton);
    }
  });
});

// 프리뷰 생성 함수
function createPreview(src, type, buttonRect) {
  // 기존 프리뷰 제거
  $(".media-preview-player").remove();

  const playerContainer = $(`<div class="media-preview-player"></div>`);
  let playerElement;

  // 파일 타입에 따라 올바른 요소 생성
  switch (type) {
    case "video":
      playerElement = $(`<video src="${src}" controls autoplay loop></video>`);
      break;
    case "audio":
      playerElement = $(`<audio src="${src}" controls autoplay loop></audio>`);
      playerContainer.addClass("has-audio");
      break;
    case "image":
      playerElement = $(`<img src="${src}">`);
      break;
  }

  // 버튼의 오른쪽에 프리뷰 배치
  if (buttonRect) {
    const previewWidth = 300;
    const previewHeight = 300;
    const offset = 10; // 버튼과 프리뷰 사이 간격
    
    let left = buttonRect.right + offset;
    let top = buttonRect.top;
    
    // 화면 밖으로 나가지 않도록 조정
    if (left + previewWidth > window.innerWidth) {
      // 오른쪽에 공간이 없으면 왼쪽에 배치
      left = buttonRect.left - previewWidth - offset;
    }
    
    if (top + previewHeight > window.innerHeight) {
      // 아래쪽에 공간이 없으면 위로 조정
      top = window.innerHeight - previewHeight - 10;
    }
    
    // 최소값 보장
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    
    playerContainer.css({
      top: `${top}px`,
      left: `${left}px`
    });
  }

  playerContainer.append(playerElement);
  $("body").append(playerContainer);
}

