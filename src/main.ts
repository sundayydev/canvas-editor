import { commentList, data, options } from './mock'
import './style.css'
import prism from 'prismjs'
import Editor, {
  BlockType,
  Command,
  ControlState,
  ControlType,
  EditorMode,
  EditorZone,
  ElementType,
  IBlock,
  ICatalogItem,
  IElement,
  KeyMap,
  ListStyle,
  ListType,
  PageMode,
  PaperDirection,
  RowFlex,
  TextDecorationStyle,
  TitleLevel,
  splitText
} from './editor'
import { Dialog } from './components/dialog/Dialog'
import { formatPrismToken } from './utils/prism'
import { Signature } from './components/signature/Signature'
import { debounce, nextTick, scrollIntoView } from './utils'

window.onload = function () {
  const isApple =
    typeof navigator !== 'undefined' && /Mac OS X/.test(navigator.userAgent)

  // 1. Khởi tạo trình soạn thảo
  const container = document.querySelector<HTMLDivElement>('.editor')!
  const instance = new Editor(
    container,
    {
      header: [
        {
          value: 'BỆNH VIỆN ĐA KHOA VĂN LANG',
          size: 32,
          rowFlex: RowFlex.CENTER
        },
        {
          value: '\nBỆNH ÁN NGOẠI TRÙ',
          size: 18,
          rowFlex: RowFlex.CENTER
        },
        {
          value: '\n',
          type: ElementType.SEPARATOR
        }
      ],
      main: <IElement[]>data,
      footer: [
        {
          value: 'canvas-editor',
          size: 12
        }
      ]
    },
    options
  )
  console.log('Instance: ', instance)
  // dùng cho cypress
  Reflect.set(window, 'editor', instance)
  // dùng cho canvas-editor-devtools
  Reflect.set(window, '__CANVAS_EDITOR_INSTANCE__', instance)

  // Hủy popup menu
  window.addEventListener(
    'click',
    evt => {
      const visibleDom = document.querySelector('.visible')
      if (!visibleDom || visibleDom.contains(<Node>evt.target)) return
      visibleDom.classList.remove('visible')
    },
    {
      capture: true
    }
  )

  // 2. | Hoàn tác | Làm lại | Cọ định dạng | Xóa định dạng |
  const undoDom = document.querySelector<HTMLDivElement>('.menu-item__undo')!
  undoDom.title = `Hoàn tác(${isApple ? '⌘' : 'Ctrl'}+Z)`
  undoDom.onclick = function () {
    console.log('undo')
    instance.command.executeUndo()
  }

  const redoDom = document.querySelector<HTMLDivElement>('.menu-item__redo')!
  redoDom.title = `Làm lại(${isApple ? '⌘' : 'Ctrl'}+Y)`
  redoDom.onclick = function () {
    console.log('redo')
    instance.command.executeRedo()
  }

  const painterDom = document.querySelector<HTMLDivElement>(
    '.menu-item__painter'
  )!

  let isFirstClick = true
  let painterTimeout: number
  painterDom.onclick = function () {
    if (isFirstClick) {
      isFirstClick = false
      painterTimeout = window.setTimeout(() => {
        console.log('painter-click')
        isFirstClick = true
        instance.command.executePainter({
          isDblclick: false
        })
      }, 200)
    } else {
      window.clearTimeout(painterTimeout)
    }
  }

  painterDom.ondblclick = function () {
    console.log('painter-dblclick')
    isFirstClick = true
    window.clearTimeout(painterTimeout)
    instance.command.executePainter({
      isDblclick: true
    })
  }

  document.querySelector<HTMLDivElement>('.menu-item__format')!.onclick =
    function () {
      console.log('format')
      instance.command.executeFormat()
    }

  // 3. | Font chữ | Tăng cỡ chữ | Giảm cỡ chữ | In đậm | In nghiêng | Gạch chân | Gạch giữa | Chỉ số trên | Chỉ số dưới | Màu chữ | Màu nền |
  const fontDom = document.querySelector<HTMLDivElement>('.menu-item__font')!
  const fontSelectDom = fontDom.querySelector<HTMLDivElement>('.select')!
  const fontOptionDom = fontDom.querySelector<HTMLDivElement>('.options')!
  fontDom.onclick = function () {
    console.log('font')
    fontOptionDom.classList.toggle('visible')
  }
  fontOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeFont(li.dataset.family!)
  }

  const sizeSetDom = document.querySelector<HTMLDivElement>('.menu-item__size')!
  const sizeSelectDom = sizeSetDom.querySelector<HTMLDivElement>('.select')!
  const sizeOptionDom = sizeSetDom.querySelector<HTMLDivElement>('.options')!
  sizeSetDom.title = `Cài đặt cỡ chữ`
  sizeSetDom.onclick = function () {
    console.log('size')
    sizeOptionDom.classList.toggle('visible')
  }
  sizeOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeSize(Number(li.dataset.size!))
  }

  const sizeAddDom = document.querySelector<HTMLDivElement>(
    '.menu-item__size-add'
  )!
  sizeAddDom.title = `Tăng cỡ chữ (${isApple ? '⌘' : 'Ctrl'}+[)`
  sizeAddDom.onclick = function () {
    console.log('size-add')
    instance.command.executeSizeAdd()
  }

  const sizeMinusDom = document.querySelector<HTMLDivElement>(
    '.menu-item__size-minus'
  )!
  sizeMinusDom.title = `Giảm cỡ chữ (${isApple ? '⌘' : 'Ctrl'}+])`
  sizeMinusDom.onclick = function () {
    console.log('size-minus')
    instance.command.executeSizeMinus()
  }

  const boldDom = document.querySelector<HTMLDivElement>('.menu-item__bold')!
  boldDom.title = `In đậm (${isApple ? '⌘' : 'Ctrl'}+B)`
  boldDom.onclick = function () {
    console.log('bold')
    instance.command.executeBold()
  }

  const italicDom =
    document.querySelector<HTMLDivElement>('.menu-item__italic')!
  italicDom.title = `In nghiêng (${isApple ? '⌘' : 'Ctrl'}+I)`
  italicDom.onclick = function () {
    console.log('italic')
    instance.command.executeItalic()
  }

  const underlineDom = document.querySelector<HTMLDivElement>(
    '.menu-item__underline'
  )!
  underlineDom.title = `Gạch chân (${isApple ? '⌘' : 'Ctrl'}+U)`
  const underlineOptionDom =
    underlineDom.querySelector<HTMLDivElement>('.options')!
  underlineDom.querySelector<HTMLSpanElement>('.select')!.onclick =
    function () {
      underlineOptionDom.classList.toggle('visible')
    }
  underlineDom.querySelector<HTMLElement>('i')!.onclick = function () {
    console.log('underline')
    instance.command.executeUnderline()
    underlineOptionDom.classList.remove('visible')
  }
  underlineDom.querySelector<HTMLUListElement>('ul')!.onmousedown = function (
    evt
  ) {
    const li = evt.target as HTMLLIElement
    const decorationStyle = <TextDecorationStyle>li.dataset.decorationStyle
    instance.command.executeUnderline({
      style: decorationStyle
    })
    underlineOptionDom.classList.remove('visible')
  }

  const strikeoutDom = document.querySelector<HTMLDivElement>(
    '.menu-item__strikeout'
  )!
  strikeoutDom.title = `Gạch giữa (${isApple ? '⌘' : 'Ctrl'}+Shift+X)`
  strikeoutDom.onclick = function () {
    console.log('strikeout')
    instance.command.executeStrikeout()
  }

  const superscriptDom = document.querySelector<HTMLDivElement>(
    '.menu-item__superscript'
  )!
  superscriptDom.title = `Chỉ số trên (${isApple ? '⌘' : 'Ctrl'}+Shift+,)`
  superscriptDom.onclick = function () {
    console.log('superscript')
    instance.command.executeSuperscript()
  }

  const subscriptDom = document.querySelector<HTMLDivElement>(
    '.menu-item__subscript'
  )!
  subscriptDom.title = `Chỉ số dưới (${isApple ? '⌘' : 'Ctrl'}+Shift+.)`
  subscriptDom.onclick = function () {
    console.log('subscript')
    instance.command.executeSubscript()
  }

  const colorControlDom = document.querySelector<HTMLInputElement>('#color')!
  colorControlDom.oninput = function () {
    instance.command.executeColor(colorControlDom.value)
  }
  const colorDom = document.querySelector<HTMLDivElement>('.menu-item__color')!
  const colorSpanDom = colorDom.querySelector('span')!
  colorDom.onclick = function () {
    console.log('color')
    colorControlDom.click()
  }

  const highlightControlDom =
    document.querySelector<HTMLInputElement>('#highlight')!
  highlightControlDom.oninput = function () {
    instance.command.executeHighlight(highlightControlDom.value)
  }
  const highlightDom = document.querySelector<HTMLDivElement>(
    '.menu-item__highlight'
  )!
  const highlightSpanDom = highlightDom.querySelector('span')!
  highlightDom.onclick = function () {
    console.log('highlight')
    highlightControlDom?.click()
  }

  const titleDom = document.querySelector<HTMLDivElement>('.menu-item__title')!
  const titleSelectDom = titleDom.querySelector<HTMLDivElement>('.select')!
  const titleOptionDom = titleDom.querySelector<HTMLDivElement>('.options')!
  titleOptionDom.querySelectorAll('li').forEach((li, index) => {
    li.title = `Ctrl+${isApple ? 'Option' : 'Alt'}+${index}`
  })

  titleDom.onclick = function () {
    console.log('title')
    titleOptionDom.classList.toggle('visible')
  }
  titleOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const level = <TitleLevel>li.dataset.level
    instance.command.executeTitle(level || null)
  }

  const leftDom = document.querySelector<HTMLDivElement>('.menu-item__left')!
  leftDom.title = `Căn trái (${isApple ? '⌘' : 'Ctrl'}+L)`
  leftDom.onclick = function () {
    console.log('left')
    instance.command.executeRowFlex(RowFlex.LEFT)
  }

  const centerDom =
    document.querySelector<HTMLDivElement>('.menu-item__center')!
  centerDom.title = `Căn giữa (${isApple ? '⌘' : 'Ctrl'}+E)`
  centerDom.onclick = function () {
    console.log('center')
    instance.command.executeRowFlex(RowFlex.CENTER)
  }

  const rightDom = document.querySelector<HTMLDivElement>('.menu-item__right')!
  rightDom.title = `Căn phải (${isApple ? '⌘' : 'Ctrl'}+R)`
  rightDom.onclick = function () {
    console.log('right')
    instance.command.executeRowFlex(RowFlex.RIGHT)
  }

  const alignmentDom = document.querySelector<HTMLDivElement>(
    '.menu-item__alignment'
  )!
  alignmentDom.title = `Căn đều hai bên (${isApple ? '⌘' : 'Ctrl'}+J)`
  alignmentDom.onclick = function () {
    console.log('alignment')
    instance.command.executeRowFlex(RowFlex.ALIGNMENT)
  }

  const justifyDom = document.querySelector<HTMLDivElement>(
    '.menu-item__justify'
  )!
  justifyDom.title = `Căn giãn đều (${isApple ? '⌘' : 'Ctrl'}+Shift+J)`
  justifyDom.onclick = function () {
    console.log('justify')
    instance.command.executeRowFlex(RowFlex.JUSTIFY)
  }

  const rowMarginDom = document.querySelector<HTMLDivElement>(
    '.menu-item__row-margin'
  )!
  const rowOptionDom = rowMarginDom.querySelector<HTMLDivElement>('.options')!
  rowMarginDom.onclick = function () {
    console.log('row-margin')
    rowOptionDom.classList.toggle('visible')
  }
  rowOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeRowMargin(Number(li.dataset.rowmargin!))
  }

  const listDom = document.querySelector<HTMLDivElement>('.menu-item__list')!
  listDom.title = `Danh sách(${isApple ? '⌘' : 'Ctrl'}+Shift+U)`
  const listOptionDom = listDom.querySelector<HTMLDivElement>('.options')!
  listDom.onclick = function () {
    console.log('list')
    listOptionDom.classList.toggle('visible')
  }
  listOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const listType = <ListType>li.dataset.listType || null
    const listStyle = <ListStyle>(<unknown>li.dataset.listStyle)
    instance.command.executeList(listType, listStyle)
  }

  // 4. | Bảng | Hình ảnh | Siêu liên kết | Đường phân chia | Hình mờ | Khối mã | Dấu phân cách | Điều khiển | Checkbox | LaTeX | Bộ chọn ngày
  const tableDom = document.querySelector<HTMLDivElement>('.menu-item__table')!
  const tablePanelContainer = document.querySelector<HTMLDivElement>(
    '.menu-item__table__collapse'
  )!
  const tableClose = document.querySelector<HTMLDivElement>('.table-close')!
  const tableTitle = document.querySelector<HTMLDivElement>('.table-select')!
  const tablePanel = document.querySelector<HTMLDivElement>('.table-panel')!
  // Vẽ các hàng và cột
  const tableCellList: HTMLDivElement[][] = []
  for (let i = 0; i < 10; i++) {
    const tr = document.createElement('tr')
    tr.classList.add('table-row')
    const trCellList: HTMLDivElement[] = []
    for (let j = 0; j < 10; j++) {
      const td = document.createElement('td')
      td.classList.add('table-cel')
      tr.append(td)
      trCellList.push(td)
    }
    tablePanel.append(tr)
    tableCellList.push(trCellList)
  }
  let colIndex = 0
  let rowIndex = 0
  // Xóa tất cả lựa chọn ô
  function removeAllTableCellSelect() {
    tableCellList.forEach(tr => {
      tr.forEach(td => td.classList.remove('active'))
    })
  }
  // Thiết lập nội dung tiêu đề
  function setTableTitle(payload: string) {
    tableTitle.innerText = payload
  }
  // Khôi phục trạng thái ban đầu
  function recoveryTable() {
    // Khôi phục kiểu chọn, tiêu đề, số hàng cột đã chọn
    removeAllTableCellSelect()
    setTableTitle('Chèn')
    colIndex = 0
    rowIndex = 0
    // Ẩn panel
    tablePanelContainer.style.display = 'none'
  }
  tableDom.onclick = function () {
    console.log('table')
    tablePanelContainer!.style.display = 'block'
  }
  tablePanel.onmousemove = function (evt) {
    const celSize = 16
    const rowMarginTop = 10
    const celMarginRight = 6
    const { offsetX, offsetY } = evt
    // Xóa tất cả lựa chọn
    removeAllTableCellSelect()
    colIndex = Math.ceil(offsetX / (celSize + celMarginRight)) || 1
    rowIndex = Math.ceil(offsetY / (celSize + rowMarginTop)) || 1
    // Thay đổi kiểu chọn
    tableCellList.forEach((tr, trIndex) => {
      tr.forEach((td, tdIndex) => {
        if (tdIndex < colIndex && trIndex < rowIndex) {
          td.classList.add('active')
        }
      })
    })
    // Thay đổi tiêu đề bảng
    setTableTitle(`${rowIndex}×${colIndex}`)
  }
  tableClose.onclick = function () {
    recoveryTable()
  }
  tablePanel.onclick = function () {
    // Áp dụng lựa chọn
    instance.command.executeInsertTable(rowIndex, colIndex)
    recoveryTable()
  }

  const imageDom = document.querySelector<HTMLDivElement>('.menu-item__image')!
  const imageFileDom = document.querySelector<HTMLInputElement>('#image')!
  imageDom.onclick = function () {
    imageFileDom.click()
  }
  imageFileDom.onchange = function () {
    const file = imageFileDom.files![0]!
    const fileReader = new FileReader()
    fileReader.readAsDataURL(file)
    fileReader.onload = function () {
      // Tính chiều rộng và chiều cao
      const image = new Image()
      const value = fileReader.result as string
      image.src = value
      image.onload = function () {
        instance.command.executeImage({
          value,
          width: image.width,
          height: image.height
        })
        imageFileDom.value = ''
      }
    }
  }

  const hyperlinkDom = document.querySelector<HTMLDivElement>(
    '.menu-item__hyperlink'
  )!
  hyperlinkDom.onclick = function () {
    console.log('hyperlink')
    new Dialog({
      title: 'Liên kết',
      data: [
        {
          type: 'text',
          label: 'Văn bản',
          name: 'name',
          required: true,
          placeholder: 'Nhập văn bản hiển thị',
          value: instance.command.getRangeText()
        },
        {
          type: 'text',
          label: 'Đường dẫn URL',
          name: 'url',
          required: true,
          placeholder: 'Nhập địa chỉ URL'
        }
      ],
      onConfirm: payload => {
        const name = payload.find(p => p.name === 'name')?.value
        if (!name) return
        const url = payload.find(p => p.name === 'url')?.value
        if (!url) return
        instance.command.executeHyperlink({
          url,
          valueList: splitText(name).map(n => ({
            value: n,
            size: 16
          }))
        })
      }
    })
  }

  const separatorDom = document.querySelector<HTMLDivElement>(
    '.menu-item__separator'
  )!
  const separatorOptionDom =
    separatorDom.querySelector<HTMLDivElement>('.options')!
  separatorDom.onclick = function () {
    console.log('separator')
    separatorOptionDom.classList.toggle('visible')
  }
  separatorOptionDom.onmousedown = function (evt) {
    let payload: number[] = []
    const li = evt.target as HTMLLIElement
    const separatorDash = li.dataset.separator?.split(',').map(Number)
    if (separatorDash) {
      const isSingleLine = separatorDash.every(d => d === 0)
      if (!isSingleLine) {
        payload = separatorDash
      }
    }
    instance.command.executeSeparator(payload)
  }

  const pageBreakDom = document.querySelector<HTMLDivElement>(
    '.menu-item__page-break'
  )!
  pageBreakDom.onclick = function () {
    console.log('pageBreak')
    instance.command.executePageBreak()
  }

  const watermarkDom = document.querySelector<HTMLDivElement>(
    '.menu-item__watermark'
  )!
  const watermarkOptionDom =
    watermarkDom.querySelector<HTMLDivElement>('.options')!
  watermarkDom.onclick = function () {
    console.log('watermark')
    watermarkOptionDom.classList.toggle('visible')
  }
  watermarkOptionDom.onmousedown = function (evt) {
    const li = evt.target as HTMLLIElement
    const menu = li.dataset.menu!
    watermarkOptionDom.classList.toggle('visible')
    if (menu === 'add') {
      new Dialog({
        title: 'Thêm hình mờ (Watermark)',
        data: [
          {
            type: 'text',
            label: 'Nội dung',
            name: 'data',
            required: true,
            placeholder: 'Nhập nội dung hình mờ'
          },
          {
            type: 'color',
            label: 'Màu sắc',
            name: 'color',
            required: true,
            value: '#AEB5C0'
          },
          {
            type: 'number',
            label: 'Cỡ chữ',
            name: 'size',
            required: true,
            value: '120'
          },
          {
            type: 'number',
            label: 'Độ trong suốt',
            name: 'opacity',
            required: true,
            value: '0.3'
          },
          {
            type: 'select',
            label: 'Lặp lại',
            name: 'repeat',
            value: '0',
            required: false,
            options: [
              {
                label: 'Không lặp',
                value: '0'
              },
              {
                label: 'Có lặp lại',
                value: '1'
              }
            ]
          },
          {
            type: 'number',
            label: 'Khoảng cách ngang',
            name: 'horizontalGap',
            required: false,
            value: '10'
          },
          {
            type: 'number',
            label: 'Khoảng cách dọc',
            name: 'verticalGap',
            required: false,
            value: '10'
          }
        ],
        onConfirm: payload => {
          const nullableIndex = payload.findIndex(p => !p.value)
          if (~nullableIndex) return
          const watermark = payload.reduce(
            (pre, cur) => {
              pre[cur.name] = cur.value
              return pre
            },
            <any>{}
          )
          const repeat = watermark.repeat === '1'
          instance.command.executeAddWatermark({
            data: watermark.data,
            color: watermark.color,
            size: Number(watermark.size),
            opacity: Number(watermark.opacity),
            repeat,
            gap:
              repeat && watermark.horizontalGap && watermark.verticalGap
                ? [
                    Number(watermark.horizontalGap),
                    Number(watermark.verticalGap)
                  ]
                : undefined
          })
        }
      })
    } else {
      instance.command.executeDeleteWatermark()
    }
  }

  const codeblockDom = document.querySelector<HTMLDivElement>(
    '.menu-item__codeblock'
  )!
  codeblockDom.onclick = function () {
    console.log('codeblock')
    new Dialog({
      title: 'Khối mã',
      data: [
        {
          type: 'textarea',
          name: 'codeblock',
          placeholder: 'Vui lòng nhập mã',
          width: 500,
          height: 300
        }
      ],
      onConfirm: payload => {
        const codeblock = payload.find(p => p.name === 'codeblock')?.value
        if (!codeblock) return
        const tokenList = prism.tokenize(codeblock, prism.languages.javascript)
        const formatTokenList = formatPrismToken(tokenList)
        const elementList: IElement[] = []
        for (let i = 0; i < formatTokenList.length; i++) {
          const formatToken = formatTokenList[i]
          const tokenStringList = splitText(formatToken.content)
          for (let j = 0; j < tokenStringList.length; j++) {
            const value = tokenStringList[j]
            const element: IElement = {
              value
            }
            if (formatToken.color) {
              element.color = formatToken.color
            }
            if (formatToken.bold) {
              element.bold = true
            }
            if (formatToken.italic) {
              element.italic = true
            }
            elementList.push(element)
          }
        }
        elementList.unshift({
          value: '\n'
        })
        instance.command.executeInsertElementList(elementList)
      }
    })
  }

  const controlDom = document.querySelector<HTMLDivElement>(
    '.menu-item__control'
  )!
  const controlOptionDom = controlDom.querySelector<HTMLDivElement>('.options')!
  controlDom.onclick = function () {
    console.log('control')
    controlOptionDom.classList.toggle('visible')
  }
  controlOptionDom.onmousedown = function (evt) {
    controlOptionDom.classList.toggle('visible')
    const li = evt.target as HTMLLIElement
    const type = <ControlType>li.dataset.control
    switch (type) {
      case ControlType.TEXT:
        new Dialog({
          title: 'Điều khiển văn bản',
          data: [
            {
              type: 'text',
              label: 'Văn bản giữ chỗ',
              name: 'placeholder',
              required: true,
              placeholder: 'Nhập văn bản giữ chỗ'
            },
            {
              type: 'text',
              label: 'Giá trị mặc định',
              name: 'value',
              placeholder: 'Nhập giá trị mặc định'
            }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(
              p => p.name === 'placeholder'
            )?.value
            if (!placeholder) return
            const value = payload.find(p => p.name === 'value')?.value || ''
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                value: value
                  ? [
                      {
                        value
                      }
                    ]
                  : null,
                placeholder
              }
            })
          }
        })
        break
      case ControlType.SELECT:
        new Dialog({
          title: 'Điều khiển danh sách lựa chọn',
          data: [
            {
              type: 'text',
              label: 'Văn bản giữ chỗ',
              name: 'placeholder',
              required: true,
              placeholder: 'Nhập văn bản giữ chỗ'
            },
            {
              type: 'text',
              label: 'Giá trị mặc định',
              name: 'code',
              placeholder: 'Nhập giá trị mặc định'
            },
            {
              type: 'textarea',
              label: 'Tập danh sách lựa chọn',
              name: 'valueSets',
              required: true,
              height: 100,
              placeholder: `Nhập định dạng JSON tập giá trị, Ví dụ:\n[{\n"value":"Có",\n"code":"98175"\n}]`
            }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(
              p => p.name === 'placeholder'
            )?.value
            if (!placeholder) return
            const valueSets = payload.find(p => p.name === 'valueSets')?.value
            if (!valueSets) return
            const code = payload.find(p => p.name === 'code')?.value
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                code,
                value: null,
                placeholder,
                valueSets: JSON.parse(valueSets)
              }
            })
          }
        })
        break
      case ControlType.CHECKBOX:
        new Dialog({
          title: 'Điều khiển ô chọn (Checkbox)',
          data: [
            {
              type: 'text',
              label: 'Giá trị mặc định',
              name: 'code',
              placeholder: 'Nhập giá trị mặc định, phân tách bằng dấu phẩy'
            },
            {
              type: 'textarea',
              label: 'Tập danh sách lựa chọn',
              name: 'valueSets',
              required: true,
              height: 100,
              placeholder: `Nhập định dạng JSON tập giá trị, Ví dụ:\n[{\n"value":"Có",\n"code":"98175"\n}]`
            }
          ],
          onConfirm: payload => {
            const valueSets = payload.find(p => p.name === 'valueSets')?.value
            if (!valueSets) return
            const code = payload.find(p => p.name === 'code')?.value
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                code,
                value: null,
                valueSets: JSON.parse(valueSets)
              }
            })
          }
        })
        break
      case ControlType.RADIO:
        new Dialog({
          title: 'Điều khiển nút chọn duy nhất (Radio)',
          data: [
            {
              type: 'text',
              label: 'Giá trị mặc định',
              name: 'code',
              placeholder: 'Nhập giá trị mặc định'
            },
            {
              type: 'textarea',
              label: 'Tập danh sách lựa chọn',
              name: 'valueSets',
              required: true,
              height: 100,
              placeholder: `Nhập định dạng JSON tập giá trị, Ví dụ:\n[{\n"value":"Có",\n"code":"98175"\n}]`
            }
          ],
          onConfirm: payload => {
            const valueSets = payload.find(p => p.name === 'valueSets')?.value
            if (!valueSets) return
            const code = payload.find(p => p.name === 'code')?.value
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                code,
                value: null,
                valueSets: JSON.parse(valueSets)
              }
            })
          }
        })
        break
      case ControlType.DATE:
        new Dialog({
          title: 'Điều khiển ngày tháng',
          data: [
            {
              type: 'text',
              label: 'Văn bản giữ chỗ',
              name: 'placeholder',
              required: true,
              placeholder: 'Nhập văn bản giữ chỗ'
            },
            {
              type: 'text',
              label: 'Giá trị mặc định',
              name: 'value',
              placeholder: 'Nhập giá trị mặc định'
            },
            {
              type: 'select',
              label: 'Định dạng ngày',
              name: 'dateFormat',
              value: 'yyyy-MM-dd hh:mm:ss',
              required: true,
              options: [
                {
                  label: 'yyyy-MM-dd hh:mm:ss',
                  value: 'yyyy-MM-dd hh:mm:ss'
                },
                {
                  label: 'yyyy-MM-dd',
                  value: 'yyyy-MM-dd'
                }
              ]
            }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(
              p => p.name === 'placeholder'
            )?.value
            if (!placeholder) return
            const value = payload.find(p => p.name === 'value')?.value || ''
            const dateFormat =
              payload.find(p => p.name === 'dateFormat')?.value || ''
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                dateFormat,
                value: value
                  ? [
                      {
                        value
                      }
                    ]
                  : null,
                placeholder
              }
            })
          }
        })
        break
      case ControlType.NUMBER:
        new Dialog({
          title: 'Điều khiển số',
          data: [
            {
              type: 'text',
              label: 'Văn bản giữ chỗ',
              name: 'placeholder',
              required: true,
              placeholder: 'Vui lòng nhập văn bản giữ chỗ'
            },
            {
              type: 'text',
              label: 'Giá trị mặc định',
              name: 'value',
              placeholder: 'Vui lòng nhập giá trị mặc định'
            }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(
              p => p.name === 'placeholder'
            )?.value
            if (!placeholder) return
            const value = payload.find(p => p.name === 'value')?.value || ''
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                value: value
                  ? [
                      {
                        value
                      }
                    ]
                  : null,
                placeholder
              }
            })
          }
        })
        break
      default:
        break
    }
  }

  const checkboxDom = document.querySelector<HTMLDivElement>(
    '.menu-item__checkbox'
  )!
  checkboxDom.onclick = function () {
    console.log('checkbox')
    instance.command.executeInsertElementList([
      {
        type: ElementType.CHECKBOX,
        checkbox: {
          value: false
        },
        value: ''
      }
    ])
  }

  const radioDom = document.querySelector<HTMLDivElement>('.menu-item__radio')!
  radioDom.onclick = function () {
    console.log('radio')
    instance.command.executeInsertElementList([
      {
        type: ElementType.RADIO,
        checkbox: {
          value: false
        },
        value: ''
      }
    ])
  }

  const latexDom = document.querySelector<HTMLDivElement>('.menu-item__latex')!
  latexDom.onclick = function () {
    console.log('LaTeX')
    new Dialog({
      title: 'LaTeX',
      data: [
        {
          type: 'textarea',
          height: 100,
          name: 'value',
          placeholder: 'Vui lòng nhập văn bản LaTeX'
        }
      ],
      onConfirm: payload => {
        const value = payload.find(p => p.name === 'value')?.value
        if (!value) return
        instance.command.executeInsertElementList([
          {
            type: ElementType.LATEX,
            value
          }
        ])
      }
    })
  }

  const dateDom = document.querySelector<HTMLDivElement>('.menu-item__date')!
  const dateDomOptionDom = dateDom.querySelector<HTMLDivElement>('.options')!
  dateDom.onclick = function () {
    console.log('date')
    dateDomOptionDom.classList.toggle('visible')
    // Điều chỉnh vị trí
    const bodyRect = document.body.getBoundingClientRect()
    const dateDomOptionRect = dateDomOptionDom.getBoundingClientRect()
    if (dateDomOptionRect.left + dateDomOptionRect.width > bodyRect.width) {
      dateDomOptionDom.style.right = '0px'
      dateDomOptionDom.style.left = 'unset'
    } else {
      dateDomOptionDom.style.right = 'unset'
      dateDomOptionDom.style.left = '0px'
    }
    // Ngày hiện tại
    const date = new Date()
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    const second = date.getSeconds().toString().padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    const dateTimeString = `${dateString} ${hour}:${minute}:${second}`
    dateDomOptionDom.querySelector<HTMLLIElement>('li:first-child')!.innerText =
      dateString
    dateDomOptionDom.querySelector<HTMLLIElement>('li:last-child')!.innerText =
      dateTimeString
  }
  dateDomOptionDom.onmousedown = function (evt) {
    const li = evt.target as HTMLLIElement
    const dateFormat = li.dataset.format!
    dateDomOptionDom.classList.toggle('visible')
    instance.command.executeInsertElementList([
      {
        type: ElementType.DATE,
        value: '',
        dateFormat,
        valueList: [
          {
            value: li.innerText.trim()
          }
        ]
      }
    ])
  }

  const blockDom = document.querySelector<HTMLDivElement>('.menu-item__block')!
  blockDom.onclick = function () {
    console.log('block')
    new Dialog({
      title: 'Khối nội dung',
      data: [
        {
          type: 'select',
          label: 'Loại',
          name: 'type',
          value: 'iframe',
          required: true,
          options: [
            {
              label: 'Trang web',
              value: 'iframe'
            },
            {
              label: 'Video',
              value: 'video'
            }
          ]
        },
        {
          type: 'number',
          label: 'Chiều rộng',
          name: 'width',
          placeholder: 'Vui lòng nhập chiều rộng (mặc định bằng chiều rộng trang)'
        },
        {
          type: 'number',
          label: 'Chiều cao',
          name: 'height',
          required: true,
          placeholder: 'Vui lòng nhập chiều cao'
        },
        {
          type: 'input',
          label: 'Địa chỉ',
          name: 'src',
          required: false,
          placeholder: 'Vui lòng nhập địa chỉ'
        },
        {
          type: 'textarea',
          label: 'HTML',
          height: 100,
          name: 'srcdoc',
          required: false,
          placeholder: 'Vui lòng nhập mã HTML (chỉ áp dụng cho loại Trang web)'
        }
      ],
      onConfirm: payload => {
        const type = payload.find(p => p.name === 'type')?.value
        if (!type) return
        const width = payload.find(p => p.name === 'width')?.value
        const height = payload.find(p => p.name === 'height')?.value
        if (!height) return
        // Địa chỉ hoặc mã HTML phải có ít nhất một trong hai
        const src = payload.find(p => p.name === 'src')?.value
        const srcdoc = payload.find(p => p.name === 'srcdoc')?.value
        const block: IBlock = {
          type: <BlockType>type
        }
        if (block.type === BlockType.IFRAME) {
          if (!src && !srcdoc) return
          block.iframeBlock = {
            src,
            srcdoc
          }
        } else if (block.type === BlockType.VIDEO) {
          if (!src) return
          block.videoBlock = {
            src
          }
        }
        const blockElement: IElement = {
          type: ElementType.BLOCK,
          value: '',
          height: Number(height),
          block
        }
        if (width) {
          blockElement.width = Number(width)
        }
        instance.command.executeInsertElementList([blockElement])
      }
    })
  }

  // 5. | Tìm kiếm & thay thế | In |
  const searchCollapseDom = document.querySelector<HTMLDivElement>(
    '.menu-item__search__collapse'
  )!
  const searchInputDom = document.querySelector<HTMLInputElement>(
    '.menu-item__search__collapse__search input'
  )!
  const replaceInputDom = document.querySelector<HTMLInputElement>(
    '.menu-item__search__collapse__replace input'
  )!
  const searchRegInputDom =
    document.querySelector<HTMLInputElement>('#option-reg')!
  const searchCaseInputDom =
    document.querySelector<HTMLInputElement>('#option-case')!
  const searchSelectionInputDom =
    document.querySelector<HTMLInputElement>('#option-selection')!
  const searchDom =
    document.querySelector<HTMLDivElement>('.menu-item__search')!
  searchDom.title = `Tìm kiếm & thay thế(${isApple ? '⌘' : 'Ctrl'}+F)`
  const searchResultDom =
    searchCollapseDom.querySelector<HTMLLabelElement>('.search-result')!
  function setSearchResult() {
    const result = instance.command.getSearchNavigateInfo()
    if (result) {
      const { index, count } = result
      searchResultDom.innerText = `${index}/${count}`
    } else {
      searchResultDom.innerText = ''
    }
  }
  searchDom.onclick = function () {
    console.log('search')
    searchCollapseDom.style.display = 'block'
    const bodyRect = document.body.getBoundingClientRect()
    const searchRect = searchDom.getBoundingClientRect()
    const searchCollapseRect = searchCollapseDom.getBoundingClientRect()
    if (searchRect.left + searchCollapseRect.width > bodyRect.width) {
      searchCollapseDom.style.right = '0px'
      searchCollapseDom.style.left = 'unset'
    } else {
      searchCollapseDom.style.right = 'unset'
    }
    searchInputDom.focus()
  }
  searchCollapseDom.querySelector<HTMLSpanElement>('span')!.onclick =
    function () {
      searchCollapseDom.style.display = 'none'
      searchInputDom.value = ''
      replaceInputDom.value = ''
      instance.command.executeSearch(null)
      setSearchResult()
    }

  function emitSearch() {
    instance.command.executeSearch(searchInputDom.value || null, {
      isRegEnable: searchRegInputDom.checked,
      isIgnoreCase: searchCaseInputDom.checked,
      isLimitSelection: searchSelectionInputDom.checked
    })
    setSearchResult()
  }

  searchInputDom.oninput = emitSearch
  searchRegInputDom.onchange = emitSearch
  searchCaseInputDom.onchange = emitSearch
  searchSelectionInputDom.onchange = emitSearch
  searchInputDom.onkeydown = function (evt) {
    if (evt.key === 'Enter') {
      emitSearch()
    }
  }
  searchCollapseDom.querySelector<HTMLButtonElement>('button')!.onclick =
    function () {
      const searchValue = searchInputDom.value
      const replaceValue = replaceInputDom.value
      if (searchValue && searchValue !== replaceValue) {
        instance.command.executeReplace(replaceValue)
      }
    }
  searchCollapseDom.querySelector<HTMLDivElement>('.arrow-left')!.onclick =
    function () {
      instance.command.executeSearchNavigatePre()
      setSearchResult()
    }
  searchCollapseDom.querySelector<HTMLDivElement>('.arrow-right')!.onclick =
    function () {
      instance.command.executeSearchNavigateNext()
      setSearchResult()
    }

  const printDom = document.querySelector<HTMLDivElement>('.menu-item__print')!
  printDom.title = `In(${isApple ? '⌘' : 'Ctrl'}+P)`
  printDom.onclick = function () {
    console.log('print')
    instance.command.executePrint()
  }

  // 6. Hiện/ẩn mục lục | Chế độ trang | Thu phóng giấy | Kích thước giấy | Hướng giấy | Lề trang | Toàn màn hình | Cài đặt
  const editorOptionDom =
    document.querySelector<HTMLDivElement>('.editor-option')!
  editorOptionDom.onclick = function () {
    const options = instance.command.getOptions()
    new Dialog({
      title: 'Cấu hình trình soạn thảo',
      data: [
        {
          type: 'textarea',
          name: 'option',
          width: 350,
          height: 300,
          required: true,
          value: JSON.stringify(options, null, 2),
          placeholder: 'Vui lòng nhập cấu hình trình soạn thảo'
        }
      ],
      onConfirm: payload => {
        const newOptionValue = payload.find(p => p.name === 'option')?.value
        if (!newOptionValue) return
        const newOption = JSON.parse(newOptionValue)
        instance.command.executeUpdateOptions(newOption)
      }
    })
  }

  async function updateCatalog() {
    const catalog = await instance.command.getCatalog()
    const catalogMainDom =
      document.querySelector<HTMLDivElement>('.catalog__main')!
    catalogMainDom.innerHTML = ''
    if (catalog) {
      const appendCatalog = (
        parent: HTMLDivElement,
        catalogItems: ICatalogItem[]
      ) => {
        for (let c = 0; c < catalogItems.length; c++) {
          const catalogItem = catalogItems[c]
          const catalogItemDom = document.createElement('div')
          catalogItemDom.classList.add('catalog-item')
          // Hiển thị
          const catalogItemContentDom = document.createElement('div')
          catalogItemContentDom.classList.add('catalog-item__content')
          const catalogItemContentSpanDom = document.createElement('span')
          catalogItemContentSpanDom.innerText = catalogItem.name
          catalogItemContentDom.append(catalogItemContentSpanDom)
          // Định vị
          catalogItemContentDom.onclick = () => {
            instance.command.executeLocationCatalog(catalogItem.id)
          }
          catalogItemDom.append(catalogItemContentDom)
          if (catalogItem.subCatalog && catalogItem.subCatalog.length) {
            appendCatalog(catalogItemDom, catalogItem.subCatalog)
          }
          // Thêm vào
          parent.append(catalogItemDom)
        }
      }
      appendCatalog(catalogMainDom, catalog)
    }
  }
  let isCatalogShow = true
  const catalogDom = document.querySelector<HTMLElement>('.catalog')!
  const catalogModeDom =
    document.querySelector<HTMLDivElement>('.catalog-mode')!
  const catalogHeaderCloseDom = document.querySelector<HTMLDivElement>(
    '.catalog__header__close'
  )!
  const switchCatalog = () => {
    isCatalogShow = !isCatalogShow
    if (isCatalogShow) {
      catalogDom.style.display = 'block'
      updateCatalog()
    } else {
      catalogDom.style.display = 'none'
    }
  }
  catalogModeDom.onclick = switchCatalog
  catalogHeaderCloseDom.onclick = switchCatalog

  const pageModeDom = document.querySelector<HTMLDivElement>('.page-mode')!
  const pageModeOptionsDom =
    pageModeDom.querySelector<HTMLDivElement>('.options')!
  pageModeDom.onclick = function () {
    pageModeOptionsDom.classList.toggle('visible')
  }
  pageModeOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executePageMode(<PageMode>li.dataset.pageMode!)
  }

  document.querySelector<HTMLDivElement>('.page-scale-percentage')!.onclick =
    function () {
      console.log('page-scale-recovery')
      instance.command.executePageScaleRecovery()
    }

  document.querySelector<HTMLDivElement>('.page-scale-minus')!.onclick =
    function () {
      console.log('page-scale-minus')
      instance.command.executePageScaleMinus()
    }

  document.querySelector<HTMLDivElement>('.page-scale-add')!.onclick =
    function () {
      console.log('page-scale-add')
      instance.command.executePageScaleAdd()
    }

  // Kích thước giấy
  const paperSizeDom = document.querySelector<HTMLDivElement>('.paper-size')!
  const paperSizeDomOptionsDom =
    paperSizeDom.querySelector<HTMLDivElement>('.options')!
  paperSizeDom.onclick = function () {
    paperSizeDomOptionsDom.classList.toggle('visible')
  }
  paperSizeDomOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const paperType = li.dataset.paperSize!
    const [width, height] = paperType.split('*').map(Number)
    instance.command.executePaperSize(width, height)
    // Hiển thị lại trạng thái giấy
    paperSizeDomOptionsDom
      .querySelectorAll('li')
      .forEach(child => child.classList.remove('active'))
    li.classList.add('active')
  }

  // Hướng giấy
  const paperDirectionDom =
    document.querySelector<HTMLDivElement>('.paper-direction')!
  const paperDirectionDomOptionsDom =
    paperDirectionDom.querySelector<HTMLDivElement>('.options')!
  paperDirectionDom.onclick = function () {
    paperDirectionDomOptionsDom.classList.toggle('visible')
  }
  paperDirectionDomOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    if (li.tagName !== 'LI' || li.classList.contains('option-caption')) return
    const { paperDirection, sectionDirection } = li.dataset
    if (sectionDirection) {
      // Chỉ định hướng trang (phần này)
      instance.command.executePageDirection(
        sectionDirection === 'inherit' ? null : <PaperDirection>sectionDirection
      )
    } else if (paperDirection) {
      instance.command.executePaperDirection(<PaperDirection>paperDirection)
    }
    // Hiển thị lại trạng thái hướng giấy
    paperDirectionDomOptionsDom
      .querySelectorAll('li')
      .forEach(child => child.classList.remove('active'))
    li.classList.add('active')
  }

  // Lề trang
  const paperMarginDom =
    document.querySelector<HTMLDivElement>('.paper-margin')!
  paperMarginDom.onclick = function () {
    const [topMargin, rightMargin, bottomMargin, leftMargin] =
      instance.command.getPaperMargin()
    new Dialog({
      title: 'Lề trang',
      data: [
        {
          type: 'text',
          label: 'Lề trên',
          name: 'top',
          required: true,
          value: `${topMargin}`,
          placeholder: 'Vui lòng nhập lề trên'
        },
        {
          type: 'text',
          label: 'Lề dưới',
          name: 'bottom',
          required: true,
          value: `${bottomMargin}`,
          placeholder: 'Vui lòng nhập lề dưới'
        },
        {
          type: 'text',
          label: 'Lề trái',
          name: 'left',
          required: true,
          value: `${leftMargin}`,
          placeholder: 'Vui lòng nhập lề trái'
        },
        {
          type: 'text',
          label: 'Lề phải',
          name: 'right',
          required: true,
          value: `${rightMargin}`,
          placeholder: 'Vui lòng nhập lề phải'
        }
      ],
      onConfirm: payload => {
        const top = payload.find(p => p.name === 'top')?.value
        if (!top) return
        const bottom = payload.find(p => p.name === 'bottom')?.value
        if (!bottom) return
        const left = payload.find(p => p.name === 'left')?.value
        if (!left) return
        const right = payload.find(p => p.name === 'right')?.value
        if (!right) return
        instance.command.executeSetPaperMargin([
          Number(top),
          Number(right),
          Number(bottom),
          Number(left)
        ])
      }
    })
  }

  // Cấu hình chia cột
  const columnConfigDom =
    document.querySelector<HTMLDivElement>('.column-config')!
  columnConfigDom.onclick = function () {
    const current = instance.command.getColumns()
    const count = current?.count ?? 1
    const gap = current?.gap ?? 20
    const separator = current?.separator ? 'true' : 'false'
    new Dialog({
      title: 'Chia cột',
      data: [
        {
          type: 'select',
          label: 'Số cột',
          name: 'count',
          required: true,
          value: `${count}`,
          options: [
            { value: '1', label: '1 (tắt)' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
            { value: '5', label: '5' }
          ]
        },
        {
          type: 'text',
          label: 'Khoảng cách cột',
          name: 'gap',
          required: true,
          value: `${gap}`,
          placeholder: 'Vui lòng nhập khoảng cách cột (pixel)'
        },
        {
          type: 'select',
          label: 'Đường phân cách',
          name: 'separator',
          required: true,
          value: separator,
          options: [
            { value: 'false', label: 'Không hiển thị' },
            { value: 'true', label: 'Hiển thị' }
          ]
        }
      ],
      onConfirm: payload => {
        const countValue = payload.find(p => p.name === 'count')?.value
        if (!countValue) return
        const gapValue = payload.find(p => p.name === 'gap')?.value
        if (!gapValue) return
        const separatorValue = payload.find(p => p.name === 'separator')?.value
        if (!separatorValue) return
        instance.command.executeSetColumns({
          count: Number(countValue),
          gap: Number(gapValue),
          separator: separatorValue === 'true'
        })
      }
    })
  }

  // Công tắc thước
  const rulerToggleDom =
    document.querySelector<HTMLDivElement>('.ruler-toggle')!
  rulerToggleDom.onclick = function () {
    instance.command.executeToggleRuler()
  }

  // Toàn màn hình
  const fullscreenDom = document.querySelector<HTMLDivElement>('.fullscreen')!
  fullscreenDom.onclick = toggleFullscreen
  window.addEventListener('keydown', evt => {
    if (evt.key === 'F11') {
      toggleFullscreen()
      evt.preventDefault()
    }
  })
  document.addEventListener('fullscreenchange', () => {
    fullscreenDom.classList.toggle('exist')
  })
  function toggleFullscreen() {
    console.log('fullscreen')
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // 7. Chế độ sử dụng trình soạn thảo
  const modeList = [
    {
      mode: EditorMode.EDIT,
      name: 'Chế độ chỉnh sửa'
    },
    {
      mode: EditorMode.CLEAN,
      name: 'Chế độ sạch'
    },
    {
      mode: EditorMode.READONLY,
      name: 'Chế độ chỉ đọc'
    },
    {
      mode: EditorMode.FORM,
      name: 'Chế độ biểu mẫu'
    },
    {
      mode: EditorMode.PRINT,
      name: 'Chế độ in'
    },
    {
      mode: EditorMode.DESIGN,
      name: 'Chế độ thiết kế'
    },
    {
      mode: EditorMode.GRAFFITI,
      name: 'Chế độ vẽ tự do'
    },
    {
      mode: EditorMode.TRACE,
      name: 'Chế độ lưu vết'
    }
  ]
  const modeElement = document.querySelector<HTMLDivElement>('.editor-mode')!
  const modeOptionsElement =
    modeElement.querySelector<HTMLUListElement>('.options')!
  const modeTextElement = modeElement.querySelector<HTMLSpanElement>('.text')!
  const modeTextMap = modeList.reduce<Record<string, string>>((acc, item) => {
    acc[item.mode] = item.name
    return acc
  }, {})
  // Khởi tạo active và .text khớp với chế độ hiện tại
  const currentMode = instance.command.getOptions().mode
  modeTextElement.innerText =
    modeTextMap[currentMode] || modeTextMap[EditorMode.EDIT]
  modeOptionsElement.querySelectorAll<HTMLLIElement>('li').forEach(li => {
    li.classList.toggle('active', li.dataset.mode === currentMode)
  })

  // Công tắc ghi lưu vết (chỉ hiển thị ở dòng "Chế độ lưu vết"; bị vô hiệu trong chế độ xem lưu vết)
  const traceToggleDom = document.querySelector<HTMLInputElement>(
    '.trace-toggle__input'
  )!
  traceToggleDom.checked = !instance.command.getOptions().trace?.disabled
  traceToggleDom.disabled = currentMode === EditorMode.TRACE
  traceToggleDom.onchange = function () {
    instance.command.executeToggleTrace(traceToggleDom.checked)
  }

  const applyMode = (mode: EditorMode) => {
    modeTextElement.innerText = modeTextMap[mode]
    instance.command.executeMode(mode)
    // Cập nhật active và .text khớp với chế độ hiện tại
    modeOptionsElement.querySelectorAll<HTMLLIElement>('li').forEach(li => {
      li.classList.toggle('active', li.dataset.mode === mode)
    })
    // Thiết lập phản hồi trực quan quyền thanh menu
    const isReadonly = mode === EditorMode.READONLY || mode === EditorMode.TRACE
    const enableMenuList = ['search', 'print']
    document.querySelectorAll<HTMLDivElement>('.menu-item>div').forEach(dom => {
      const menu = dom.dataset.menu
      isReadonly && (!menu || !enableMenuList.includes(menu))
        ? dom.classList.add('disable')
        : dom.classList.remove('disable')
    })
    // Chế độ xem lưu vết cấm chuyển về trạng thái ghi
    traceToggleDom.disabled = mode === EditorMode.TRACE
  }
  modeElement.onclick = function (evt) {
    // Khi click li không toggle popup lặp lại (để options xử lý)
    if ((evt.target as HTMLElement).tagName === 'LI') return
    modeOptionsElement.classList.toggle('visible')
  }
  modeOptionsElement.onclick = function (evt) {
    const target = evt.target as HTMLElement
    if (target.closest('.trace-toggle')) return
    const li = target.closest('li')
    if (!li) return
    const mode = li.dataset.mode as EditorMode
    if (!modeTextMap[mode]) return
    applyMode(mode)
    modeOptionsElement.classList.remove('visible')
  }

  // Mô phỏng bình luận
  const commentDom = document.querySelector<HTMLDivElement>('.comment')!
  async function updateComment() {
    const groupIds = await instance.command.getGroupIds()
    for (const comment of commentList) {
      const activeCommentDom = commentDom.querySelector<HTMLDivElement>(
        `.comment-item[data-id='${comment.id}']`
      )
      // Trình soạn thảo có tồn tại group id tương ứng không
      if (groupIds.includes(comment.id)) {
        // Dom hiện tại có tồn tại không - không tồn tại thì thêm mới
        if (!activeCommentDom) {
          const commentItem = document.createElement('div')
          commentItem.classList.add('comment-item')
          commentItem.setAttribute('data-id', comment.id)
          commentItem.onclick = () => {
            instance.command.executeLocationGroup(comment.id)
          }
          commentDom.append(commentItem)
          // Thông tin vùng chọn
          const commentItemTitle = document.createElement('div')
          commentItemTitle.classList.add('comment-item__title')
          commentItemTitle.append(document.createElement('span'))
          const commentItemTitleContent = document.createElement('span')
          commentItemTitleContent.innerText = comment.rangeText
          commentItemTitle.append(commentItemTitleContent)
          const closeDom = document.createElement('i')
          closeDom.onclick = () => {
            instance.command.executeDeleteGroup(comment.id)
          }
          commentItemTitle.append(closeDom)
          commentItem.append(commentItemTitle)
          // Thông tin cơ bản
          const commentItemInfo = document.createElement('div')
          commentItemInfo.classList.add('comment-item__info')
          const commentItemInfoName = document.createElement('span')
          commentItemInfoName.innerText = comment.userName
          const commentItemInfoDate = document.createElement('span')
          commentItemInfoDate.innerText = comment.createdDate
          commentItemInfo.append(commentItemInfoName)
          commentItemInfo.append(commentItemInfoDate)
          commentItem.append(commentItemInfo)
          // Bình luận chi tiết
          const commentItemContent = document.createElement('div')
          commentItemContent.classList.add('comment-item__content')
          commentItemContent.innerText = comment.content
          commentItem.append(commentItemContent)
          commentDom.append(commentItem)
        }
      } else {
        // Nếu editor không tồn tại group id tương ứng thì xóa dom
        activeCommentDom?.remove()
      }
    }
  }
  // 8. Lắng nghe sự kiện nội bộ
  instance.listener.rangeStyleChange = function (payload) {
    // Loại điều khiển
    payload.type === ElementType.SUBSCRIPT
      ? subscriptDom.classList.add('active')
      : subscriptDom.classList.remove('active')
    payload.type === ElementType.SUPERSCRIPT
      ? superscriptDom.classList.add('active')
      : superscriptDom.classList.remove('active')
    payload.type === ElementType.SEPARATOR
      ? separatorDom.classList.add('active')
      : separatorDom.classList.remove('active')
    separatorOptionDom
      .querySelectorAll('li')
      .forEach(li => li.classList.remove('active'))
    if (payload.type === ElementType.SEPARATOR) {
      const separator = payload.dashArray.join(',') || '0,0'
      const curSeparatorDom = separatorOptionDom.querySelector<HTMLLIElement>(
        `[data-separator='${separator}']`
      )!
      if (curSeparatorDom) {
        curSeparatorDom.classList.add('active')
      }
    }

    // Văn bản đa dạng
    fontOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    const curFontDom = fontOptionDom.querySelector<HTMLLIElement>(
      `[data-family='${payload.font}']`
    )
    if (curFontDom) {
      fontSelectDom.innerText = curFontDom.innerText
      fontSelectDom.style.fontFamily = payload.font
      curFontDom.classList.add('active')
    }
    sizeOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    const curSizeDom = sizeOptionDom.querySelector<HTMLLIElement>(
      `[data-size='${payload.size}']`
    )
    if (curSizeDom) {
      sizeSelectDom.innerText = curSizeDom.innerText
      curSizeDom.classList.add('active')
    } else {
      sizeSelectDom.innerText = `${payload.size}`
    }
    payload.bold
      ? boldDom.classList.add('active')
      : boldDom.classList.remove('active')
    payload.italic
      ? italicDom.classList.add('active')
      : italicDom.classList.remove('active')
    payload.underline
      ? underlineDom.classList.add('active')
      : underlineDom.classList.remove('active')
    payload.strikeout
      ? strikeoutDom.classList.add('active')
      : strikeoutDom.classList.remove('active')
    if (payload.color) {
      colorDom.classList.add('active')
      colorControlDom.value = payload.color
      colorSpanDom.style.backgroundColor = payload.color
    } else {
      colorDom.classList.remove('active')
      colorControlDom.value = '#000000'
      colorSpanDom.style.backgroundColor = '#000000'
    }
    if (payload.highlight) {
      highlightDom.classList.add('active')
      highlightControlDom.value = payload.highlight
      highlightSpanDom.style.backgroundColor = payload.highlight
    } else {
      highlightDom.classList.remove('active')
      highlightControlDom.value = '#ffff00'
      highlightSpanDom.style.backgroundColor = '#ffff00'
    }

    // Bố cục dòng
    leftDom.classList.remove('active')
    centerDom.classList.remove('active')
    rightDom.classList.remove('active')
    alignmentDom.classList.remove('active')
    justifyDom.classList.remove('active')
    if (payload.rowFlex && payload.rowFlex === 'right') {
      rightDom.classList.add('active')
    } else if (payload.rowFlex && payload.rowFlex === 'center') {
      centerDom.classList.add('active')
    } else if (payload.rowFlex && payload.rowFlex === 'alignment') {
      alignmentDom.classList.add('active')
    } else if (payload.rowFlex && payload.rowFlex === 'justify') {
      justifyDom.classList.add('active')
    } else {
      leftDom.classList.add('active')
    }

    // Khoảng cách dòng
    rowOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    const curRowMarginDom = rowOptionDom.querySelector<HTMLLIElement>(
      `[data-rowmargin='${payload.rowMargin}']`
    )!
    curRowMarginDom.classList.add('active')

    // Chức năng
    payload.undo
      ? undoDom.classList.remove('no-allow')
      : undoDom.classList.add('no-allow')
    payload.redo
      ? redoDom.classList.remove('no-allow')
      : redoDom.classList.add('no-allow')
    payload.painter
      ? painterDom.classList.add('active')
      : painterDom.classList.remove('active')

    // Tiêu đề
    titleOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    if (payload.level) {
      const curTitleDom = titleOptionDom.querySelector<HTMLLIElement>(
        `[data-level='${payload.level}']`
      )!
      titleSelectDom.innerText = curTitleDom.innerText
      curTitleDom.classList.add('active')
    } else {
      titleSelectDom.innerText = 'Nội dung chính'
      titleOptionDom.querySelector('li:first-child')!.classList.add('active')
    }

    // Danh sách
    listOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    if (payload.listType) {
      listDom.classList.add('active')
      const listType = payload.listType
      const listStyle =
        payload.listType === ListType.OL ? ListStyle.DECIMAL : payload.listType
      const curListDom = listOptionDom.querySelector<HTMLLIElement>(
        `[data-list-type='${listType}'][data-list-style='${listStyle}']`
      )
      if (curListDom) {
        curListDom.classList.add('active')
      }
    } else {
      listDom.classList.remove('active')
    }

    // Bình luận
    commentDom
      .querySelectorAll<HTMLDivElement>('.comment-item')
      .forEach(commentItemDom => {
        commentItemDom.classList.remove('active')
      })
    if (payload.groupIds) {
      const [id] = payload.groupIds
      const activeCommentDom = commentDom.querySelector<HTMLDivElement>(
        `.comment-item[data-id='${id}']`
      )
      if (activeCommentDom) {
        activeCommentDom.classList.add('active')
        scrollIntoView(commentDom, activeCommentDom)
      }
    }

    // Thông tin hàng cột
    const rangeContext = instance.command.getRangeContext()
    if (rangeContext) {
      document.querySelector<HTMLSpanElement>('.row-no')!.innerText = `${
        rangeContext.startRowNo + 1
      }`
      document.querySelector<HTMLSpanElement>('.col-no')!.innerText = `${
        rangeContext.startColNo + 1
      }`
    }
  }

  instance.listener.visiblePageNoListChange = function (payload) {
    const text = payload.map(i => i + 1).join(', ')
    document.querySelector<HTMLSpanElement>('.page-no-list')!.innerText = text
  }

  instance.listener.pageSizeChange = function (payload) {
    document.querySelector<HTMLSpanElement>('.page-size')!.innerText =
      `${payload}`
  }

  instance.listener.intersectionPageNoChange = function (payload) {
    document.querySelector<HTMLSpanElement>('.page-no')!.innerText = `${
      payload + 1
    }`
  }

  instance.listener.pageScaleChange = function (payload) {
    document.querySelector<HTMLSpanElement>(
      '.page-scale-percentage'
    )!.innerText = `${Math.floor(payload * 10 * 10)}%`
  }

  instance.listener.controlChange = function (payload) {
    const disableMenusInControlContext = [
      'table',
      'hyperlink',
      'separator',
      'page-break',
      'control'
    ]
    // Quyền thao tác menu
    disableMenusInControlContext.forEach(menu => {
      const menuDom = document.querySelector<HTMLDivElement>(
        `.menu-item__${menu}`
      )!
      payload.state === ControlState.ACTIVE
        ? menuDom.classList.add('disable')
        : menuDom.classList.remove('disable')
    })
  }

  instance.listener.pageModeChange = function (payload) {
    const activeMode = pageModeOptionsDom.querySelector<HTMLLIElement>(
      `[data-page-mode='${payload}']`
    )!
    pageModeOptionsDom
      .querySelectorAll('li')
      .forEach(li => li.classList.remove('active'))
    activeMode.classList.add('active')
  }

  const handleContentChange = async function () {
    // Số chữ
    const wordCount = await instance.command.getWordCount()
    document.querySelector<HTMLSpanElement>('.word-count')!.innerText = `${
      wordCount || 0
    }`
    // Mục lục
    if (isCatalogShow) {
      nextTick(() => {
        updateCatalog()
      })
    }
    // Bình luận
    nextTick(() => {
      updateComment()
    })
  }
  instance.listener.contentChange = debounce(handleContentChange, 200)
  handleContentChange()

  instance.listener.saved = function (payload) {
    console.log('elementList: ', payload)
  }

  // 9. Đăng ký menu chuột phải
  // Macro: khôi phục macro đã lưu từ localStorage
  const MACRO_STORAGE_KEY = 'canvas-editor:macros'
  const saved = localStorage.getItem(MACRO_STORAGE_KEY)
  if (saved) {
    instance.macro.importMacros(saved)
  }
  instance.register.contextMenuList([
    {
      name: 'Bình luận',
      when: payload => {
        return (
          !payload.isReadonly &&
          payload.editorHasSelection &&
          payload.zone === EditorZone.MAIN
        )
      },
      callback: (command: Command) => {
        new Dialog({
          title: 'Bình luận',
          data: [
            {
              type: 'textarea',
              label: 'Bình luận',
              height: 100,
              name: 'value',
              required: true,
              placeholder: 'Vui lòng nhập bình luận'
            }
          ],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            if (!value) return
            const groupId = command.executeSetGroup()
            if (!groupId) return
            commentList.push({
              id: groupId,
              content: value,
              userName: 'Hufe',
              rangeText: command.getRangeText(),
              createdDate: new Date().toLocaleString()
            })
          }
        })
      }
    },
    {
      name: 'Thêm chú thích',
      icon: 'caption',
      when: payload => {
        return (
          !payload.isReadonly &&
          payload.startElement?.type === ElementType.IMAGE &&
          !payload.startElement?.imgCaption
        )
      },
      callback: (command: Command) => {
        new Dialog({
          title: 'Thêm chú thích',
          data: [
            {
              type: 'text',
              label: 'Nội dung chú thích',
              name: 'value',
              required: true,
              placeholder: 'Vui lòng nhập nội dung chú thích, dùng {imageNo} cho số thứ tự hình ảnh'
            }
          ],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            if (!value) return
            command.executeSetImageCaption({
              value
            })
          }
        })
      }
    },
    {
      name: 'Sửa chú thích',
      icon: 'caption',
      when: payload => {
        return (
          !payload.isReadonly &&
          payload.startElement?.type === ElementType.IMAGE &&
          !!payload.startElement?.imgCaption
        )
      },
      callback: (command: Command, context) => {
        const currentCaption = context.startElement?.imgCaption
        new Dialog({
          title: 'Sửa chú thích',
          data: [
            {
              type: 'text',
              label: 'Nội dung chú thích',
              name: 'value',
              required: true,
              value: currentCaption?.value,
              placeholder: 'Vui lòng nhập nội dung chú thích, dùng {imageNo} cho số thứ tự hình ảnh'
            }
          ],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            command.executeSetImageCaption({
              ...currentCaption,
              value: value || ''
            })
          }
        })
      }
    },
    {
      name: 'Chữ ký',
      icon: 'signature',
      when: payload => {
        return !payload.isReadonly && payload.editorTextFocus
      },
      callback: (command: Command) => {
        new Signature({
          onConfirm(payload) {
            if (!payload) return
            const { value, width, height } = payload
            if (!value || !width || !height) return
            command.executeInsertElementList([
              {
                value,
                width,
                height,
                type: ElementType.IMAGE
              }
            ])
          }
        })
      }
    },
    {
      name: 'Định dạng chuẩn',
      icon: 'word-tool',
      when: payload => {
        return !payload.isReadonly
      },
      callback: (command: Command) => {
        command.executeWordTool()
      }
    },
    {
      name: 'Xóa nét vẽ tự do',
      when: payload => {
        return payload.options.mode === EditorMode.GRAFFITI
      },
      callback: (command: Command) => {
        command.executeClearGraffiti()
      }
    },
    {
      name: 'Macro',
      when: payload => !payload.isReadonly,
      childMenus: [
        {
          name: 'Ghi Macro',
          icon: 'record',
          when: () => !instance.macro.isRecording(),
          callback: () => {
            instance.macro.startRecording()
          }
        },
        {
          name: 'Dừng ghi Macro',
          icon: 'stop',
          when: () => instance.macro.isRecording(),
          callback: () => {
            new Dialog({
              title: 'Lưu Macro',
              data: [
                {
                  type: 'text',
                  label: 'Tên Macro',
                  name: 'name',
                  required: true,
                  placeholder: 'Nhập tên Macro'
                }
              ],
              onConfirm: payload => {
                const name = payload.find(p => p.name === 'name')?.value
                if (!name) return
                const macro = instance.macro.stopRecording(name)
                if (!macro) return
                localStorage.setItem(
                  MACRO_STORAGE_KEY,
                  instance.macro.exportMacros()
                )
              },
              onCancel: () => {
                instance.macro.cancelRecording()
              }
            })
          }
        },
        {
          name: 'Phát lại Macro',
          when: () =>
            !instance.macro.isRecording() &&
            instance.macro.getMacros().length > 0,
          callback: () => {
            const macros = instance.macro.getMacros()
            new Dialog({
              title: 'Phát lại Macro',
              data: [
                {
                  type: 'select',
                  label: 'Chọn Macro',
                  name: 'macroId',
                  required: true,
                  options: macros.map(m => ({
                    label: `${m.name} (${m.type})`,
                    value: m.id
                  }))
                }
              ],
              onConfirm: async payload => {
                const id = payload.find(p => p.name === 'macroId')?.value
                if (!id) return
                await instance.macro.play(id)
              }
            })
          }
        },
        {
          name: 'Quản lý Macro',
          when: () =>
            !instance.macro.isRecording() &&
            instance.macro.getMacros().length > 0,
          callback: () => {
            const macros = instance.macro.getMacros()
            new Dialog({
              title: 'Quản lý Macro',
              data: [
                {
                  type: 'select',
                  label: 'Chọn Macro cần xóa',
                  name: 'macroId',
                  options: macros.map(m => ({
                    label: `${m.name} (${m.type})`,
                    value: m.id
                  }))
                }
              ],
              onConfirm: payload => {
                const id = payload.find(p => p.name === 'macroId')?.value
                if (!id) return
                if (instance.macro.removeMacro(id)) {
                  localStorage.setItem(
                    MACRO_STORAGE_KEY,
                    instance.macro.exportMacros()
                  )
                }
              }
            })
          }
        }
      ]
    }
  ])

  // 10. Đăng ký phím tắt
  instance.register.shortcutList([
    {
      key: KeyMap.P,
      mod: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePrint()
      }
    },
    {
      key: KeyMap.F,
      mod: true,
      isGlobal: true,
      callback: (command: Command) => {
        const text = command.getRangeText()
        searchDom.click()
        if (text) {
          searchInputDom.value = text
          instance.command.executeSearch(text)
          setSearchResult()
        }
      }
    },
    {
      key: KeyMap.MINUS,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleMinus()
      }
    },
    {
      key: KeyMap.EQUAL,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleAdd()
      }
    },
    {
      key: KeyMap.ZERO,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleRecovery()
      }
    }
  ])
}
