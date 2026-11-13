# LichSOMA's Taskbar Extension API

Taskbar 3.0.0의 공개 API 규약이다. 다른 FVTT 모듈이 작업표시줄 우측에 버튼을 등록할 수 있다.

기존 `.taskbar-right` DOM 구조는 유지하므로, 이전처럼 DOM에 버튼을 직접 삽입하던 모듈도 계속 동작한다. 신규 연동은 공개 API 사용을 권장한다.

## 접근

```js
const taskbarApi = game.modules.get('lichsoma-taskbar')?.api;
```

API는 모듈 스크립트 로드 시점부터 등록되며 Taskbar DOM이 아직 생성되지 않았어도 `registerButton`을 호출할 수 있다. 등록 내용은 보관되었다가 Taskbar 생성 후 자동 렌더된다.

대체 접근 경로도 제공한다.

```js
const taskbarApi = window.LichsomaTaskbar?.api;
```

## 기능 지원 확인

`apiVersion: 1`은 호출 규약 버전이며 모듈 배포 버전과 별개다. 기존 메서드를 유지한 기능 추가는 `apiVersion`을 올리지 않고 `supports(feature)`로 구분한다. 알 수 없는 이름이나 문자열이 아닌 값은 `false`를 반환한다. `capabilities`와 API 객체는 읽기 전용이다.

```js
const module = game.modules.get('lichsoma-taskbar');
const api = module?.active ? module.api : null;
const supported = api?.supports?.('buttons') === true
  && typeof api.registerButton === 'function';
// supported가 false이면 소비 모듈의 구형 버튼 삽입 경로를 사용한다.
```

| 기능 이름 | 보장 범위 |
|---|---|
| `buttons` | 등록·갱신·해제·조회, 생성 전 등록 보관 |
| `buttonState` | active / visible / disabled 상태와 handle 갱신 |
| `buttonBadges` | 숫자·문자·점 배지 |
| `buttonOrder` | 확장 영역 안의 order 정렬 |
| `readyHook` | 작업표시줄 생성·재생성 후 ready Hook과 자동 버튼 복원 |

기존 `apiVersion`/메서드 검사와 전역 대체 경로도 유지한다. `supports`가 없는 예전 개발본은 신형 기능을 보장하는 대상으로 취급하지 않는다.

## 버튼 등록

```js
const handle = taskbarApi.registerButton({
  id: 'lichsoma-retro-pc-com',
  icon: 'fa-solid fa-desktop',
  title: () => game.i18n.localize('RETROPCOM.Taskbar.Title'),
  order: 100,
  onClick: () => {
    // PC통신 단말기 열기
  }
});
```

`id`는 Taskbar 전체에서 유일해야 한다. 다른 모듈은 자신의 module id를 포함한 이름을 사용하는 것을 권장한다.

같은 ID 재등록은 정의를 갱신한다. 작은 `order`가 왼쪽이며 같은 값은 ID 순으로 정렬한다. 확장 영역은 닫기·설정·시계 등 기본 영역의 왼쪽이다. 캘린더는 `Number.MAX_SAFE_INTEGER`를 사용해 일반 확장 버튼 뒤에 둔다. 다른 모듈은 이 값을 예약값으로 취급하고 유한한 일반 순서 값을 사용한다. DOM에 직접 삽입한 구형 버튼은 API 정렬 대상이 아니다.

## 등록 옵션

| 필드 | 형식 | 기본값 | 설명 |
|---|---|---:|---|
| `id` | string | 필수 | 버튼 등록 ID |
| `icon` | string | `""` | Font Awesome class 등 |
| `label` | string | `""` | 아이콘 옆 텍스트. `icon` 또는 `label` 중 하나는 필요 |
| `title` | string/function | `""` | tooltip. 함수이면 렌더 시 평가 |
| `ariaLabel` | string/function | title/label/id | 접근성 라벨 |
| `order` | number | `100` | 작은 값이 먼저 표시 |
| `active` | boolean | `false` | 활성 강조 |
| `disabled` | boolean | `false` | 클릭 비활성 |
| `visible` | boolean | `true` | 표시 여부 |
| `badge` | number/string/boolean | `null` | 숫자/문자 배지. `true`는 dot |
| `onClick` | function | `null` | 좌클릭 콜백 |
| `onContextMenu` | function | `null` | 우클릭 콜백 |

## 상태 갱신

```js
taskbarApi.setButtonActive('lichsoma-retro-pc-com', true);
taskbarApi.setButtonBadge('lichsoma-retro-pc-com', 3);
taskbarApi.setButtonVisible('lichsoma-retro-pc-com', true);
taskbarApi.setButtonDisabled('lichsoma-retro-pc-com', false);
```

또는 등록 시 반환되는 handle을 사용할 수 있다.

```js
handle.setActive(true);
handle.setBadge(3);
handle.update({ title: 'PC통신', order: 50 });
handle.unregister();
```

## API 목록

```text
apiVersion
capabilities
supports(feature)
registerButton(definition)
unregisterButton(id)
updateButton(id, patch)
setButtonActive(id, active)
setButtonBadge(id, badge)
setButtonVisible(id, visible)
setButtonDisabled(id, disabled)
getButton(id)
listButtons()
render()
```

`notifyTaskbarReady()`는 Taskbar 자체가 사용하는 lifecycle 메서드이므로 소비 모듈에서는 호출하지 않는다.

## Hook

필요하면 다음 Hook을 구독할 수 있다.

```text
lichsoma-taskbar.ready
lichsoma-taskbar.buttonRegistered
lichsoma-taskbar.buttonUpdated
lichsoma-taskbar.buttonUnregistered
```

일반적인 소비 모듈은 `ready` Hook을 기다릴 필요 없이 `registerButton()`을 호출하면 된다.

ready Hook 인자는 `(api, generation)`이다. 재생성 시에도 호출되며 등록된 버튼은 먼저 복원된다. 소비 모듈은 중복 등록을 피하도록 동일 ID를 사용하고, 자체 handle이 있으면 상태 갱신에 재사용한다. 해제된 handle의 갱신은 `false`를 반환하므로 다시 `registerButton()`으로 등록한다. DOM 교체 후에는 `api.notifyTaskbarReady()`를 작업표시줄 자체가 호출해야 하며, 관찰자만으로 모든 외부 DOM 변경을 자동 복구하는 규약은 아니다.

## 하위 호환

3.0.0은 다음 기존 구조를 유지한다.

```text
#lichsoma-taskbar
.taskbar-left
.taskbar-center
.taskbar-right
```

따라서 기존 Smartphone처럼 `.taskbar-right`에 직접 버튼을 삽입하는 모듈도 계속 작동한다. 향후에는 각 모듈을 공개 API로 순차 이전하는 것을 권장한다.
