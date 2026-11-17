let tables = {
	main: null,
	option_pos: null,
	sht_off: null,
	sht_arr: {
		unfocused: [],
		focused: [],
		extra: []
	},
	active: null
};

let activeTable = [false];

let shtObject = null;
let documents = [];
let activeDocumentId = null;
let nextDocumentId = 1;
let suppressLogs = false;

let clipboard = [];

let exportType = false;

const EXPORT = {
	SHT: 0,
	JSON: 1,
	LS: 2
}

function getTemplate(classname) {
	let temp = document.querySelector("."+classname+".template").cloneNode(true);
	temp.classList.remove("template");
	return temp;
};

function setFileInfo(txt) {
	$fileinfo.innerText = txt;
	document.head.querySelector("title").innerText = txt;
	let activeDocument = getActiveDocument();
	if (activeDocument) activeDocument.fileInfo = txt;
};

function createTablesState() {
	return {
		main: null,
		option_pos: null,
		sht_off: null,
		sht_arr: {unfocused: [], focused: [], extra: []},
		active: null
	};
}

function getActiveDocument() {
	return documents.find(doc => doc.id == activeDocumentId) || null;
}

function saveActiveDocument() {
	let doc = getActiveDocument();
	if (!doc) return;
	doc.shtObject = shtObject;
	doc.currentStruct = currentStruct;
	doc.tables = tables;
	doc.activeTable = activeTable;
	doc.sourceFileHandle = sourceFileHandle;
	doc.fileName = $filename.value || doc.fileName;
	doc.fileInfo = $fileinfo.innerText;
	while ($filetree.firstChild) doc.fileTree.appendChild($filetree.firstChild);
	while ($container.firstChild) doc.tableContent.appendChild($container.firstChild);
}

function renderDocumentTabs() {
	$documentTabs.innerHTML = "";
	documents.forEach(doc => {
		let tab = document.createElement("div");
		tab.className = "document-tab";
		if (doc.id == activeDocumentId) tab.classList.add("active");

		let select = document.createElement("button");
		select.type = "button";
		select.className = "document-tab-select";
		select.dataset.documentAction = "activate";
		select.dataset.documentId = doc.id;
		select.setAttribute("role", "tab");
		select.setAttribute("aria-selected", doc.id == activeDocumentId);
		select.title = doc.fileInfo || doc.fileName;
		select.textContent = doc.fileName;

		let close = document.createElement("button");
		close.type = "button";
		close.className = "document-tab-close";
		close.dataset.documentAction = "close";
		close.dataset.documentId = doc.id;
		close.setAttribute("aria-label", "关闭 " + doc.fileName);
		close.textContent = "×";

		tab.appendChild(select);
		tab.appendChild(close);
		$documentTabs.appendChild(tab);
	});
}

function activateDocument(id) {
	if (id == activeDocumentId) return;
	saveActiveDocument();
	let doc = documents.find(item => item.id == id);
	if (!doc) return;

	activeDocumentId = doc.id;
	shtObject = doc.shtObject;
	currentStruct = doc.currentStruct;
	tables = doc.tables;
	activeTable = doc.activeTable || [false];
	sourceFileHandle = doc.sourceFileHandle || null;
	$filename.value = doc.fileName;
	$fileinfo.innerText = doc.fileInfo;
	document.head.querySelector("title").innerText = doc.fileInfo;
	$filetree.innerHTML = "";
	$container.innerHTML = "";
	while (doc.fileTree.firstChild) $filetree.appendChild(doc.fileTree.firstChild);
	while (doc.tableContent.firstChild) $container.appendChild(doc.tableContent.firstChild);
	$export.querySelector(".overwrite-source").checked = false;
	updateSourceOverwriteControl();
	renderDocumentTabs();
}

function closeDocument(id) {
	let index = documents.findIndex(doc => doc.id == id);
	if (index < 0) return;
	let wasActive = id == activeDocumentId;
	if (wasActive) saveActiveDocument();
	documents.splice(index, 1);
	if (!wasActive) {
		renderDocumentTabs();
		return;
	}

	activeDocumentId = null;
	$filetree.innerHTML = "";
	$container.innerHTML = "";
	shtObject = null;
	currentStruct = null;
	tables = createTablesState();
	activeTable = [false];
	sourceFileHandle = null;
	$filename.value = "";
	$export.querySelector(".overwrite-source").checked = false;
	if (documents.length) activateDocument(documents[Math.min(index, documents.length - 1)].id);
	else {
		setFileInfo("未加载文件");
		updateSourceOverwriteControl();
		renderDocumentTabs();
	}
}

function startEditorDocument(data, struct, options) {
	saveActiveDocument();
	let fileName = options.fileName || "未命名.sht";
	let doc = {
		id: nextDocumentId++,
		fileName: fileName,
		fileInfo: fileName + " (v" + struct.ver + ")",
		shtObject: data,
		currentStruct: struct,
		tables: createTablesState(),
		activeTable: [false],
		sourceFileHandle: options.sourceFileHandle || null,
		fileTree: document.createElement("div"),
		tableContent: document.createElement("div")
	};
	documents.push(doc);
	activeDocumentId = doc.id;
	shtObject = data;
	currentStruct = struct;
	tables = doc.tables;
	activeTable = doc.activeTable;
	sourceFileHandle = doc.sourceFileHandle;
	$filename.value = fileName;
	$filetree.innerHTML = "";
	$container.innerHTML = "";
	setFileInfo(doc.fileInfo);
	$export.querySelector(".overwrite-source").checked = false;
	updateSourceOverwriteControl();
	renderDocumentTabs();
}

function toolbarClick(e) {
	let $targ = e.target;
	if ($targ.dataset.toolbar)  {
		toolbarAction($targ.dataset.toolbar);
	};
};

function toolbarAction(action) {
	switch(action) {
		case "open":
			openImport();
		break;
		case "openJson":
			openImportJson();
		break;
		case "openLS":
			openImportLS();
		break;
		/*case "opentest":
			loadTest();
		break;*/
		case "export":
			openExport(EXPORT.SHT);
		break;
		case "exportJson":
			openExport(EXPORT.JSON);
		break;
		case "exportLS":
			openExport(EXPORT.LS);
		break;
		case "console":
			openConsole();
		break;
		case "raddeg":
			openRadDeg();
		break;
		case "refresh":
			refreshPageWithCacheBust();
		break;
		case "github":
			window.open("https://github.com/NOTIINKFELL/-sht-",  "_blank");
		break;
		case "readme":
			window.open("https://github.com/NOTIINKFELL/-sht-/blob/main/README.md", "_blank");
		break;
		case "info":
			openInfo();
		break;
	};
};

let activeWindows = [];
let draggedWindow = null;
let draggedShooters = null;
let dragOrigin = {left: 0, top: 0};

function editorWindow(options) {
	let $wnd = getTemplate("editor-window");
	let $header =  $wnd.querySelector(".window-header");
	let $content = $wnd.querySelector(".window-content");

	if (options.header) {
		if (activeWindows.indexOf(options.header) > -1) return;
		activeWindows.push(options.header);
		$header.innerHTML = options.header;
	};
	if (options.content) {
		if (typeof options.content == "string") $content.innerHTML = options.content;
		else $content.appendChild(options.content);
	};
	if (options.width) $wnd.style.width = options.width + "px";
	document.body.appendChild($wnd);

	let rect = $wnd.getBoundingClientRect();
	$wnd.style.left = window.innerWidth/2 - rect.width/2 + "px";
	$wnd.style.top = window.innerHeight/2 - rect.height/2 + "px";

	let $close = $wnd.querySelector(".window-close");
	$close.addEventListener("click", e => {
		if (options.close) options.close(e);
		if (options.header) activeWindows.splice(activeWindows.indexOf(options.header), 1);
		document.body.removeChild($wnd);
	});

	$header.addEventListener("mousedown", e => {
		draggedWindow = $wnd;
		dragOrigin.left = e.offsetX;
		dragOrigin.top = e.offsetY;
		let $top = document.querySelector(".on-top");
		if ($top) $top.classList.remove("on-top");
		$wnd.classList.add("on-top");
	});

	if (options.success) options.success();
};

function cAlert(txt) {
	editorWindow({
		content: txt
	});
};

function openImport() {
	editorWindow({
		header: "Open",
		content: $open,
		width: 343
	});
};

function openImportJson() {
	editorWindow({
		header: "Open",
		content: $openJson,
		width: 343
	});
};

function openImportLS() {
	populateOpenLSsel();
	editorWindow({
		header: "Open",
		content: $openLS,
		width: 363
	});
};

function populateOpenLSsel() {
	let list = localStorage.getItem("___fileIndex");
	if (list == null) list = [];
	else list = JSON.parse(list);
	list.unshift("LoLK Sanae (bundled with the editor)", 15);
	
	let html = "";
	for (let i=0; i<list.length; i+=2) {
		html += "<option value='"+(i/2)+"'>"+list[i]+"</option>";
	};

	$openLSsel.innerHTML = html;
};

function loadLS() {
	let ind = ($openLSsel.value - 1)*2; // ind=-2 is the bundled sanae
	if (ind == -2) {
		const struct = window.struct_15;
		const data = readSht(window._testshot, struct);
		generateEditorTable(data, struct, {fileName: "LoLK Sanae.sht"});
	} else {
		let list = localStorage.getItem("___fileIndex");
		list = JSON.parse(list);
		let name = list[ind], ver = list[ind+1];
		let file = localStorage.getItem("localshot_"+name);
		if (file == null) {
			deleteFromLS(ind);
			populateOpenLSsel();
			return cAlert("File not in storage!");
		};
		try {
			let arr = readLSfile(file);
			let struct = getStruct(ver, true);
			let data = readSht(arr, struct);
			generateEditorTable(data, struct, {fileName: name});
		} catch(e) {
			deleteFromLS(ind);
			populateOpenLSsel();
			cAlert("File is corrupted!");
			throw e;
		};
	};
};

function readLSfile(file) {
	// file = string made of bytes in hex
	let arr = [];
	for (let i=0; i<file.length; i+=2) {
		let val = parseInt(file[i] + file[i+1], 16);
		if (isNaN(val)) throw "file corrupted";
		arr.push(val);
	};
	return arr;
};

function deleteFromLS(ind) {
	if (typeof ind == "undefined") ind = ($openLSsel.value - 1)*2;
	if (ind == -2) return cAlert("You can't delete the budled .sht<br>It's not actually stored in the browser storage anyway.");
	let list = localStorage.getItem("___fileIndex");
	list = JSON.parse(list);
	let name = list[ind];
	localStorage.removeItem("localshot_"+name);
	list.splice(ind, 2);
	localStorage.setItem("___fileIndex", JSON.stringify(list));
	populateOpenLSsel();
};

function openExport(type) {
	if (!shtObject) return error("Can't export a file before loading it");
	exportType = type;
	let overwriteOption = $export.querySelector(".overwrite-source-option");
	overwriteOption.style.display = type == EXPORT.SHT ? "block" : "none";
	$export.querySelector(".overwrite-source-note").style.display =
		type == EXPORT.SHT && !(sourceFileHandle && sourceFileHandle.createWritable) ? "block" : "none";
	$export.querySelector(".overwrite-source").checked = false;
	editorWindow({
		header: "Export",
		content: $export,
		width: 275
	});
};

function exportToLS(arr, name, ver) {
	let str = "";
	for (let i=0; i<arr.length; i++) {
		let hex = arr[i].toString(16);
		if (hex.length == 1) hex = "0" + hex;
		str += hex;
	};
	let list = localStorage.getItem("___fileIndex");
	if (list == null) list = [];
	else list = JSON.parse(list);

	if (list.indexOf(name) > -1) {
		if (!confirm("There's already a file with this name saved in the browser storage. Do you want to overwrite it?")) return;
		list.splice(list.indexOf(name), 2);
	};

	localStorage.setItem("localshot_"+name, str);
	list.push(name, ver);
	localStorage.setItem("___fileIndex", JSON.stringify(list));
};

function loadTest() {
	let $script = document.createElement("script");
	$script.src = "js/test.js";
	document.head.appendChild($script);
};

function openRadDeg() {
	editorWindow({
		header: "Radian converter",
		content: $radDeg,
		width: 324
	});
};

function toDeg() {
	$degInput.value = parseFloat(($radInput.value * 180 / Math.PI).toFixed(5));
};

function toRad() {
	$radInput.value = $degInput.value * Math.PI / 180;
};

function openInfo() {
	editorWindow({
		header: "信息",
		content: "<b>.sht 编辑器 v"+version+" 由 Priw8 & <a href='https://github.com/Priw8/sht-webedit/graphs/contributors' target='_blank'>贡献者</a> 开发 <br>非官方汉化:NOT_INK_FELL</b><br>" + 
				 "Discord: Priw8#9873<br>您也可以查看 <a href='https://discord.gg/fvPJvHJ' target='_blank'>ZUNcode 服务器!</a><br><br><b>更新日志</b>- "
				 +changelog.join("<br>- "),
		width: 300

	});
};

function openConsole() {
	editorWindow({
		header: "Console",
		content: $console
	});
	$log.scrollTop = 9999999;
};

function log(txt) {
	if (suppressLogs) return;
	$log.innerHTML += "<div>"+txt+"</div>";
	$log.scrollTop = 9999999;
};

function error(txt) {
	log("<span style='color:#ff6f6f'>Error: " + txt+"</span>");
	openConsole();
};

function doEval() {
	let val = $evalInput.value;
	$evalInput.value = "";
	log("&gt; "+val);
	let input = val.split(" ");
	let cmd = input.splice(0, 1)[0];
	let handle = ({
		"validation": state  => {
			if (state == "on") {
				validationOff = false;
				return "Validation turned on";
			} else if (state == "off") {
				validationOff = true;
				return "Validation turned off";
			} else {
				return "Invalid validation state, must be either 'on' or 'off'";
			}
		}
	})[cmd];
	if (handle) {
		log("&lt; " + handle.apply(window, input));
	} else {
		try {
			let res = eval(val);
			log("&lt; " + res);
		} catch(e) {
			log(e.toString());
		};
	};
};

function getLastValid(table, stat, foc, pow) {
	let ret;
	try {
		if (table == "sht_arr") {
			if (stat != "power") {
				let [i, rstat, flagno] = stat.split("-");
				if (rstat != "flag") ret = shtObject[table][foc][pow][i][rstat];
				else ret = shtObject[table][foc][pow][i].flags[flagno];
			} else {
				ret = shtObject[table][foc][pow].power;
			};
		} else if (table == "main") {
			ret = shtObject[stat];
		} else if (table == "option_pos") {
			let [foc, pow, i, coord] = stat.split("-");
			ret = shtObject[table][foc][pow][i][coord];
		};
	} catch(e) {
		return 0;
	};
	if (typeof ret == "undefined") ret = 0;
	return ret;
};

function onInput(e) {
	let $targ = e.target;
	if ($targ.dataset.type) {
		tableInput($targ, $targ.value, $targ.dataset.type, $targ.dataset.stat);
	};
};

function tableInput($targ, val, type, stat) {
	switch(type) {
		case "byte":
			if (isNaN(val)) $targ.value = getLastValid(activeTable[0], stat, activeTable[1], activeTable[2]);
			if (val < 0) $targ.value = 0;
			if (val > 255) $targ.value = 255;
		break;
		case "int16":
			if (isNaN(val) && val != "-") $targ.value = getLastValid(activeTable[0], stat, activeTable[1], activeTable[2]);
			if (val < -32768) $targ.value = -32768;
			if (val > 32767) $targ.value = 32767;
		break;
		case "int32":
			if (isNaN(val) && val != "-") $targ.value = getLastValid(activeTable[0], stat, activeTable[1], activeTable[2]);
			if (val < -2147483648) $targ.value = -2147483648;
			if (val > 2147483647) $targ.value = 2147483647;
		break;
		case "uint32":
			if (isNaN(val)) $targ.value = getLastValid(activeTable[0], stat, activeTable[1], activeTable[2]);
			if (val < 0) $targ.value = 0;
			if (val > 4294967295) $targ.value = 4294967295; 
		break;
		case "float":
			if (isNaN(val) && val != "-") $targ.value = getLastValid(activeTable[0], stat, activeTable[1], activeTable[2]);
		break;
	};

	updateData($targ.value, stat);
};

function updateData(val, stat) {
	let table = activeTable[0], foc = activeTable[1], pow = activeTable[2];
	if (table == "sht_arr") {
		val = Number(val);
		if (stat != "power") {
			let [i, rstat, flagno] = stat.split("-");
			if (rstat != "flag") shtObject[table][foc][pow][i][rstat] = val;
			else shtObject[table][foc][pow][i].flags[flagno] = val;
		} else {
			shtObject[table][foc][pow].power = val;
		};
	} else if (table == "main") {
		shtObject[stat] = Number(val);
	} else if (table == "option_pos") {
		let [foc, pow, i, coord] = stat.split("-");
		shtObject[table][foc][pow][i][coord] = Number(val);
	} else if (table == "spellname_arr") {
		let num = stat.split("-")[1];
		shtObject[table][num] = val;
	}
};

function initUI() {
	$toolbar.addEventListener("click", toolbarClick);
	$documentTabs.addEventListener("click", e => {
		let $action = e.target.closest("[data-document-action]");
		if (!$action) return;
		let id = Number($action.dataset.documentId);
		if ($action.dataset.documentAction == "activate") activateDocument(id);
		else if ($action.dataset.documentAction == "close") closeDocument(id);
	});

	document.addEventListener("dragover", e => {
		if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, "Files") > -1) {
			e.preventDefault();
			e.dataTransfer.dropEffect = "copy";
		}
	});
	document.addEventListener("drop", e => {
		if (!e.dataTransfer || !e.dataTransfer.files.length) return;
		e.preventDefault();
		let sht = e.dataTransfer.files[0];
		if (!/\.sht$/i.test(sht.name)) {
			cAlert("请拖入 .sht 文件");
			return;
		}

		let item = e.dataTransfer.items[0];
		if (item && item.getAsFileSystemHandle) {
			let handlePromise;
			try {
				handlePromise = item.getAsFileSystemHandle();
			} catch(err) {
				error(err.toString());
				openFile([sht]);
				openImport();
				return;
			}
			handlePromise.then(handle => {
				openFile([sht], handle && handle.kind == "file" ? handle : null);
				openImport();
			}).catch(err => {
				error(err.toString());
				openFile([sht]);
				openImport();
			});
		} else {
			openFile([sht]);
			openImport();
		}
	});

	document.addEventListener("mousemove", e => {
		if (draggedWindow) {
			draggedWindow.style.left = e.clientX - dragOrigin.left + "px";
			draggedWindow.style.top = e.clientY - dragOrigin.top + "px";
			let rect = draggedWindow.getBoundingClientRect();
			if (rect.top < 0) draggedWindow.style.top = "0px";
			if (rect.left < 0) draggedWindow.style.left = "0px";
			if (rect.left > window.innerWidth - rect.width) draggedWindow.style.left = window.innerWidth - rect.width + "px";
			if (rect.top > window.innerHeight - rect.height) draggedWindow.style.top = window.innerHeight - rect.height + "px";
		};
	});
	document.addEventListener("mouseup", e => {
		draggedWindow = null;
	});

	document.addEventListener("keydown", handleShooterClipboardShortcuts);

	$evalInput.addEventListener("keydown", e => {
		if (e.which == 13) doEval();
	})

	document.addEventListener("mouseover", e => {
		let $targ = e.target;
		if ($targ.dataset.type) showTip($targ);
	});
	document.addEventListener("mouseout", e => {
		let $targ = e.target;
		if ($targ.dataset.type) hideTip();
	});

	document.addEventListener("keydown", onInput);
	document.addEventListener("keyup", onInput);
	document.addEventListener("input", onInput);
};

function showTip($targ) {
	$tip.style.display = "block";
	let rect = $targ.getBoundingClientRect();
	let left = rect.left;
	let top = rect.top + window.scrollY;
	let targW = rect.width;
	let targH = rect.height;
	$tip.innerHTML = $targ.dataset.type;
	let tipW = $tip.offsetWidth;
	let tipH = $tip.offsetHeight;

	$tip.style.left = left + targW/2 - tipW/2 + "px";
	$tip.style.top = top - tipH - 2 + "px";

	$tip.style.opacity = 1;
};

function hideTip() {
	$tip.style.opacity = 0;
	$tip.style.display = "none";
};

function generateFileTree(regen) {
	let html = "";

	html += "<div data-tree='main' onclick='loadTable(\"main\", false, false, this)' class='filetree-entry'>自机属性</div>";
	if (currentStruct.option_pos_len) html += "<div data-tree='option_pos' onclick='loadTable(\"option_pos\", false, false, this)' class='filetree-entry'>子机位置</div>";
	if (currentStruct.spellname_arr_len) html += "<div data-tree='option_pos' onclick='loadTable(\"spellname_arr\", false, false, this)' class='filetree-entry'>符卡名字</div>";
	html += "<div data-tree='sht_off' onclick='loadTable(\"sht_off\", false, false, this)' class='filetree-entry'>sht_off</div>";

	if (currentStruct.f_uf_shooter_split) {
		html += "<div data-tree='sht_arr_unfocused' class='filetree-entry expandable hidden'>";
			html += "<div onclick='expandTree(this)' class='expandable-text'>高速配置</div>";
			for (let i=0; i<tables.sht_arr.unfocused.length; i++) {
				html += "<div data-tree='unfocused-"+i+"' class='expandable-option'><span onclick='loadTable(\"sht_arr\", \"unfocused\", "+i+", this)'>"+i+" 火力</span> <span onclick='removeShooterset(\"unfocused\", "+i+")'>(删除)</span> <span onclick='copyShooterset(\"unfocused\", "+i+")'>(复制)</span></div>";
			};
			html += "<div class='expandable-option' onclick='addShooterset(\"unfocused\")'><span>新建</span></div>";
		html += "</div>";

		html += "<div data-tree='sht_arr_focused' class='filetree-entry expandable hidden'>";
			html += "<div onclick='expandTree(this)'class='expandable-text'>低速配置</div>";
			for (let i=0; i<tables.sht_arr.focused.length; i++) {
				html += "<div data-tree='focused-"+i+"' class='expandable-option'><span onclick='loadTable(\"sht_arr\", \"focused\", "+i+", this)'>"+i+" 火力</span> <span onclick='removeShooterset(\"focused\", "+i+")'>(删除)</span> <span onclick='copyShooterset(\"focused\", "+i+")'>(复制)</span></div>";
			};
			html += "<div class='expandable-option' onclick='addShooterset(\"focused\")'><span>新建</span></div>";
		html += "</div>";

		html += "<div data-tree='sht_arr_extra' class='filetree-entry expandable hidden'>";
			html += "<div onclick='expandTree(this)' class='expandable-text'>其他配置</div>";
			for (let i=0; i<tables.sht_arr.extra.length; i++) {
				html += "<div data-tree='extra-"+i+"' class='expandable-option'><span onclick='loadTable(\"sht_arr\", \"extra\", "+i+", this)'>其他 "+i+"</span> <span onclick='removeShooterset(\"extra\", "+i+")'>(删除)</span> <span onclick='copyShooterset(\"extra\", "+i+")'>(复制)</span></div>";
			};
			html += "<div class='expandable-option' onclick='addShooterset(\"extra\")'><span>新建</span></div>";
		html += "</div>";
	} else {
		html += "<div data-tree='sht_arr_main' class='filetree-entry expandable hidden'>";
			html += "<div onclick='expandTree(this)' class='expandable-text'>主要配置</div>";
			for (let i=0; i<tables.sht_arr.main.length; i++) {
				let txt;
				if (currentStruct.ver != 9) txt = i + " 火力";
				else txt = "shooterset "+i;
				html += "<div data-tree='main-"+i+"' class='expandable-option'><span onclick='loadTable(\"sht_arr\", \"main\", "+i+", this)'>"+txt+"</span> <span onclick='removeShooterset(\"main\", "+i+")'>(删除)</span> <span onclick='copyShooterset(\"main\", "+i+")'>(复制)</span></div>";
			};
			html += "<div class='expandable-option' onclick='addShooterset(\"main\")'><span>新建</span></div>";
		html += "</div>";
	};

	let $els;
	if (regen) $els = document.querySelectorAll("[data-tree]");
	else $els = [];
	$filetree.innerHTML = html;

	for (let i=0; i<$els.length; i++) {
		let $old = $els[i];
		let dat = $old.dataset.tree;
		let $new = document.querySelector("[data-tree='"+dat+"']");
		if ($new) $new.classList.value = $old.classList.value;
	};
};

function expandTree($node) {
	let $parent = $node.parentElement;
	$parent.classList.toggle("hidden");
};

function loadTable(type, foc, pow, $btt) {
	let $active = tables.active;
	if ($active) $container.removeChild($active);

	let $activebtt = document.querySelector(".tree-active");
	if ($activebtt) $activebtt.classList.remove("tree-active");

	$btt.classList.add("tree-active");
	
	let $table;
	if (type != "sht_arr") {
		$table = tables[type];
	} else {
		let arr = table = tables[type][foc][pow];
		$table = document.createElement("div");
		arr.forEach(a => $table.appendChild(a));
	};
	$container.appendChild($table);
	tables.active = $table;

	activeTable = [type, foc, pow, $btt];
};

function reloadCurrentEditor() {
	loadTable.apply(window, activeTable);
};

function generateEditorTable(data, struct, options) {
	startEditorDocument(data, struct, options || {});
	log("starting table generation");
	console.log(data);
	log("generate main table");

	let html = "";
	html += "<details class='collapsible-table' open><summary>主属性表</summary>";
	html += "<table>";
	html += "<tr><th>属性</th><th>数值</th></tr>";
	for (let i=0; i<struct.main.length; i+=2) {
		let stat = struct.main[i];
		let type = struct.main[i+1];
		if (type == "option_pos") {
			generateOptionPosTable(data, struct);
		} else if (type == "sht_off") {
			generateShotOffsetTable(data, struct);
		} else if (type == "sht_arr") {
			generateShootArrayTable(data, struct);
		} else if (type == "spellname_arr") {
			generateSpellNameArrayTable(data, struct);
		} else {
			html += `
			<tr>
				<td>${stat}</td>
				<td><input value="${data[stat]}" data-type="${type}" data-stat="${stat}"></td>
			</tr>`;
		};
	};
	html += `
	<tr>
		<td data-type="the amount of shootersets there actually are - the rest of the offset array will be filled with 0s">real_sht_off_cnt</td>
		<td><input value="${data.real_sht_off_cnt}" data-type="int32" data-stat="real_sht_off_cnt"></td>
	</tr>`
	html += "</table>";
	html += "</details>";

	let $main = document.createElement("div");
	$main.innerHTML = html;
	tables.main = $main;

	generateFileTree();
};

function generateSpellNameArrayTable(data, struct) {
	log("generate spellname_arr table");
	data = data.spellname_arr;
	let html = "<details class='collapsible-table'><summary>符卡名称表</summary>";
	for (let i=0; i<data.length; i++) {
		let name = data[i];
		html += "符卡名 "+i+": ";
		html += "<input style='width: 300px' value='"+sanitizeString(name)+"' data-type='shift_jis string' data-stat='spellname-"+i+"'>";
		html += "<br><br>";
	}
	html += "</details>";
	let $spellname_arr = document.createElement("div");
	$spellname_arr.innerHTML = html;
	tables.spellname_arr = $spellname_arr;
}

function generateOptionPosTable(data, struct) {
	log("generate option_pos table");
	let html = "";
	for (let focused=0; focused<2; focused++) {
		let foccn = (focused ? "低速" : "高速");
		let foc = (focused ? "focused" : "unfocused");
		let pos = data.option_pos[foc];
		html += `<details class='collapsible-table'><summary>${foccn} - 子机位置</summary>`;
		for (let i=1; i<pos.length;i++) {
			html += `<details class='collapsible-table'><summary>${i} 火力</summary>`;
			html += "<table>";
			html += "<tr><th>子机</th><th>x</th><th>y</th></tr>"
			for (let j=0; j<i; j++) {
				let coords = pos[i][j];
				html += `
				<tr>
					<td>${j}</td>
					<td><input value="${coords.x}" data-type="float" data-stat="${foc}-${i}-${j}-x"></td>
					<td><input value="${coords.y}" data-type="float" data-stat="${foc}-${i}-${j}-y"></td>
				</tr>
				`;
			};
			html +=  "</table>";
			html += "</details>";
		};
		html += "</details>";
	};
	let $option_pos = document.createElement("div");
	$option_pos.innerHTML = html;
	tables.option_pos = $option_pos;
};

function generateShotOffsetTable(data, struct) {
	log("generate sht_off table");
	let offs = data.sht_off;
	let html = "<details class='collapsible-table'><summary>射击偏移表 (只读)</summary>";
	html += "<h3>此表格为只读状态，偏移量在导出时会重新计算（无法更改）</h3>";
	html += "<table>";
	html += "<tr><th>no.</th><th>offset</th></tr>";
	for (let i=0; i<offs.length; i++) {
		html += `
		<tr>
			<td>${i}</td>
			<td>${offs[i]}</td>
		</tr>
		`;
	};
	html += "</table>";
	html += "</details>";
	
	let $sht_off = document.createElement("div");
	$sht_off.innerHTML = html;
	tables.sht_off = $sht_off;
};

function generateShootArrayTable(data, struct) {
	log("generate sht_arr table");
	let shtstruct = struct.sht_arr;
	for (let focused=0; focused<3; focused++) {
		let foc;
		if (currentStruct.f_uf_shooter_split) {
			if (focused == 0) foc = "unfocused";
			else if (focused == 1) foc = "focused";
			else foc = "extra";
		} else foc = "main";
		let arr = data.sht_arr[foc];
		tables.sht_arr[foc] = [];
		for (let pow=0; pow<arr.length; pow++) {
			let shooters = arr[pow];
			let $editor = document.createElement("div");
			$editor.className = "shooter-editor";
			let $list = document.createElement("div");
			$list.className = "shooter-list";
			let $inspector = document.createElement("div");
			$inspector.className = "shooter-inspector";
			$inspector.innerHTML = "<p>点击左侧发射器，在此编辑属性。</p>";
			let shooterGroups = new Map();
			let bindNumbers = new Set();
			shooters.forEach(shooter => {
				if (shooter != null) bindNumbers.add(getShooterBindNumber(shooter));
			});
			let positions = shtObject.option_pos && shtObject.option_pos[foc] && shtObject.option_pos[foc][pow];
			if (Array.isArray(positions)) {
				for (let bind=0; bind<positions.length; bind++) bindNumbers.add(bind);
			}
			Array.from(bindNumbers).filter(Number.isFinite).sort((a, b) => a - b).forEach(bindNumber => {
				shooterGroups.set(bindNumber, createShooterGroup(bindNumber));
			});
			if (bindNumbers.has("占位符")) shooterGroups.set("占位符", createShooterGroup("占位符"));
			shooterGroups.forEach(group => $list.appendChild(group));

			if (typeof shooters.power != "undefined") {
				let $power = document.createElement("div");
				let txt = "切换到下一组发射器所需要";
				if (struct.ver == 9) txt += " (永夜抄/妖妖梦SHT文件残留部分，没啥用)";
				$power.innerHTML = txt + ": <input value='" + shooters.power + "' data-type='uint32' data-stat='power'> Power";
				$list.appendChild($power);
			}

			for (let i=0; i<shooters.length; i++) {
				let shooter = shooters[i];
				let bindNumber = shooter == null ? "占位符" : getShooterBindNumber(shooter);
				let group = shooterGroups.get(bindNumber);
				if (!group) {
					group = createShooterGroup(bindNumber);
					shooterGroups.set(bindNumber, group);
					$list.appendChild(group);
				}

				let $select = document.createElement("button");
				$select.type = "button";
				$select.className = "shooter-select";
				$select.dataset.shooterIndex = i;
				$select.textContent = shooter == null ? "发射器 " + i + "（占位符）" : "发射器 " + i;
				$select.disabled = shooter == null;
				$select.draggable = shooter != null && getShooterBindProperty(shooter) != null;
				$select.addEventListener("click", e => {
					updateShooterSelection(i, e, $editor);
					selectShooter(i, foc, pow, $editor);
				});
				$select.addEventListener("dragstart", e => {
					if (!$select.draggable) {
						e.preventDefault();
						return;
					}
					let selected = selectedShooterIndices($editor);
					if (!selected.includes(i)) {
						selected = [i];
						setShooterSelection($editor, selected);
					}
					draggedShooters = {editor: $editor, foc: foc, pow: pow, indices: selected};
					e.dataTransfer.effectAllowed = "move";
					e.dataTransfer.setData("text/plain", "shooter");
					$editor.classList.add("shooter-dragging");
				});
				$select.addEventListener("dragend", () => {
					draggedShooters = null;
					$editor.classList.remove("shooter-dragging");
					$editor.querySelectorAll(".shooter-list-group.drag-target").forEach(group => group.classList.remove("drag-target"));
				});
				group.appendChild($select);
			};

			let $actions = document.createElement("div");
			$actions.className = "shooter-list-actions";
			let $add = document.createElement("button");
			$add.type = "button";
			$add.textContent = "添加发射器";
			$add.addEventListener("click", addShooter);
			let $paste = document.createElement("button");
			$paste.type = "button";
			$paste.textContent = "粘贴发射器";
			$paste.addEventListener("click", pasteShooter);
			$actions.appendChild($add);
			$actions.appendChild($paste);
			$list.appendChild($actions);
			$editor.appendChild($list);
			$editor.appendChild($inspector);
			tables.sht_arr[foc][pow] = [$editor];
		};
	};
};

function createShooterGroup(bindNumber) {
	let group = document.createElement("div");
	group.className = "shooter-list-group";
	if (Number.isFinite(bindNumber)) {
		group.dataset.bindNumber = bindNumber;
		group.addEventListener("dragover", e => {
			if (draggedShooters && draggedShooters.editor === group.closest(".shooter-editor")) {
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
				group.classList.add("drag-target");
			}
		});
		group.addEventListener("dragleave", e => {
			if (!group.contains(e.relatedTarget)) group.classList.remove("drag-target");
		});
		group.addEventListener("drop", e => {
			if (!draggedShooters || draggedShooters.editor !== group.closest(".shooter-editor")) return;
			e.preventDefault();
			e.stopPropagation();
			let drag = draggedShooters;
			draggedShooters = null;
			drag.editor.classList.remove("shooter-dragging");
			drag.editor.querySelectorAll(".shooter-list-group.drag-target").forEach(target => target.classList.remove("drag-target"));
			changeShooterBinding(drag.indices, Number(group.dataset.bindNumber), drag.foc, drag.pow, drag.editor);
		});
	}
	let title = document.createElement("div");
	title.className = "shooter-list-group-title";
	title.textContent = "子机 " + bindNumber;
	group.appendChild(title);
	return group;
}

function getShooterBindNumber(shooter) {
	let property = getShooterBindProperty(shooter);
	let bindNumber = property ? Number(shooter[property]) : 0;
	return Number.isFinite(bindNumber) ? bindNumber : 0;
};

function getShooterBindProperty(shooter) {
	if (!shooter) return null;
	let properties = ["绑定子机", "th19绑定子机", "bind", "option"];
	let available = properties.filter(property => Object.prototype.hasOwnProperty.call(shooter, property));
	return available.find(property => Number(shooter[property]) !== 0) || available[0] || null;
};

function isShooterAngle(stat) {
	return /角度|angle/i.test(stat);
};

function isShooterBindStat(stat) {
	let bindStat = stat.split("-").slice(1).join("-");
	return bindStat == "绑定子机" || bindStat == "th19绑定子机" || bindStat == "bind" || bindStat == "option";
};

function selectShooter(index, foc, pow, editor) {
	let bindingChanged = false;
	if (editor.dataset.selectedShooter != null) {
		bindingChanged = commitShooterEdits(Number(editor.dataset.selectedShooter), foc, pow, editor, null, false);
		if (bindingChanged == null) return;
	}
	editor.dataset.selectedShooter = index;
	editor.querySelectorAll(".shooter-select").forEach($button => {
		$button.classList.toggle("active", !$button.disabled && Number($button.dataset.shooterIndex) == index);
	});

	let $inspector = editor.querySelector(".shooter-inspector");
	$inspector.innerHTML = "";
	let shooter = shtObject.sht_arr[foc][pow][index];
	if (!shooter) {
		$inspector.innerHTML = "<p>此位置是占位符，没有可编辑的发射器属性。</p>";
		return;
	}

	let $title = document.createElement("h3");
	$title.textContent = "发射器 " + index + " 属性";
	$inspector.appendChild($title);
	let $note = document.createElement("p");
	$note.className = "shooter-editor-note";
	$note.textContent = "Ctrl/Shift 点击可多选；拖到子机组可改绑，Ctrl+C/V 可复制/粘贴。属性离开输入框后自动保存；角度按 Enter 转为弧度。";
	$inspector.appendChild($note);

	let $table = document.createElement("table");
	$table.innerHTML = "<thead><tr><th>属性</th><th>数值</th></tr></thead>";
	let $tbody = document.createElement("tbody");
	let shtstruct = currentStruct.sht_arr;
	for (let j=0; j<shtstruct.length; j+=2) {
		let stat = shtstruct[j];
		let type = shtstruct[j+1];
		if (type == "flags") {
			let typeStr = currentStruct.flag_size == 2 ? "int16" : "int32";
			let flagCount = currentStruct.flags_len/currentStruct.flag_size;
			for (let flag=0; flag<flagCount; flag++) {
				appendShooterField($tbody, "flag " + flag, shooter.flags[flag], typeStr, index + "-flag-" + flag,
					{index: index, foc: foc, pow: pow, editor: editor});
			}
		} else {
			let value = shooter[stat];
			if (isShooterAngle(stat)) value = Number((Number(value) * 180 / Math.PI).toFixed(5));
			let context = {index: index, foc: foc, pow: pow, stat: stat, editor: editor};
			appendShooterField($tbody, isShooterAngle(stat) ? stat + "（度）" : stat, value, type, index + "-" + stat, context);
		}
	}
	$table.appendChild($tbody);
	$inspector.appendChild($table);

	let $actions = document.createElement("div");
	$actions.className = "shooter-inspector-actions";
	let $save = document.createElement("button");
	$save.type = "button";
	$save.textContent = "确定并保存属性";
	$save.addEventListener("click", () => confirmShooterEdits(index, foc, pow, editor));
	let $copy = document.createElement("button");
	$copy.type = "button";
	$copy.textContent = "复制发射器";
	$copy.addEventListener("click", () => copyShooter(index));
	let $delete = document.createElement("button");
	$delete.type = "button";
	$delete.textContent = "删除发射器";
	$delete.addEventListener("click", () => removeShooter(index));
	$actions.appendChild($save);
	$actions.appendChild($copy);
	$actions.appendChild($delete);
	$inspector.appendChild($actions);
	if (bindingChanged) refreshShooterSet(index, foc, pow);
};

function appendShooterField(tbody, label, value, type, stat, context) {
	let row = document.createElement("tr");
	let name = document.createElement("td");
	name.textContent = label;
	let cell = document.createElement("td");
	let input = document.createElement("input");
	input.type = "number";
	input.step = type == "float" ? "any" : "1";
	input.value = value;
	input.dataset.originalValue = input.value;
	input.dataset.valueType = type;
	input.dataset.stat = stat;
	let dial = null;
	if (context && isShooterAngle(context.stat || "")) {
		row.classList.add("shooter-angle-row");
		input.dataset.angleMode = "degrees";
		input.addEventListener("input", () => {
			if (input.dataset.angleMode == "radians") {
				input.dataset.angleMode = "degrees";
				name.textContent = context.stat + "（度）";
			}
			updateShooterAngleDial(input, dial);
		});
		input.addEventListener("keydown", e => {
			if (e.key == "Enter") {
				e.preventDefault();
				convertShooterAngleInput(input, context);
			}
		});
		dial = createShooterAngleDial(input, context);
		cell.appendChild(input);
		cell.appendChild(dial);
	} else {
		cell.appendChild(input);
	}
	input.addEventListener("blur", () => {
		let bindingChanged = commitShooterEdits(context.index, context.foc, context.pow, context.editor, input, false);
		if (bindingChanged) {
			setTimeout(() => {
				if (context.editor.isConnected) {
					let selectedIndex = Number(context.editor.dataset.selectedShooter);
					refreshShooterSet(selectedIndex, context.foc, context.pow);
				}
			}, 0);
		}
	});
	row.appendChild(name);
	row.appendChild(cell);
	tbody.appendChild(row);
};

function createShooterAngleDial(input, context) {
	let ns = "http://www.w3.org/2000/svg";
	let dial = document.createElementNS(ns, "svg");
	dial.classList.add("shooter-angle-dial");
	dial.setAttribute("viewBox", "0 0 100 100");
	dial.setAttribute("role", "slider");
	dial.setAttribute("aria-label", "角度圆环，-90度为向上");
	dial.setAttribute("aria-valuemin", "-180");
	dial.setAttribute("aria-valuemax", "180");
	dial.setAttribute("tabindex", "0");

	let ring = document.createElementNS(ns, "circle");
	ring.setAttribute("cx", "50");
	ring.setAttribute("cy", "50");
	ring.setAttribute("r", "38");
	ring.classList.add("shooter-angle-ring");
	dial.appendChild(ring);

	let pointer = document.createElementNS(ns, "line");
	pointer.setAttribute("x1", "50");
	pointer.setAttribute("y1", "50");
	pointer.classList.add("shooter-angle-pointer");
	dial.appendChild(pointer);

	let center = document.createElementNS(ns, "circle");
	center.setAttribute("cx", "50");
	center.setAttribute("cy", "50");
	center.setAttribute("r", "3");
	center.classList.add("shooter-angle-center");
	dial.appendChild(center);

	let upLabel = document.createElementNS(ns, "text");
	upLabel.setAttribute("x", "50");
	upLabel.setAttribute("y", "10");
	upLabel.setAttribute("text-anchor", "middle");
	upLabel.classList.add("shooter-angle-up-label");
	upLabel.textContent = "-90°";
	dial.appendChild(upLabel);

	let setFromPointer = e => {
		let rect = dial.getBoundingClientRect();
		let x = e.clientX - rect.left - rect.width / 2;
		let y = e.clientY - rect.top - rect.height / 2;
		let degrees = Math.atan2(y, x) * 180 / Math.PI;
		let cardinal = Math.round(degrees / 90) * 90;
		if (Math.abs(degrees - cardinal) <= 3) degrees = cardinal;
		input.dataset.angleMode = "degrees";
		input.dataset.originalValue = "__angle-dial-pending__";
		nameForShooterInput(input).textContent = context.stat + "（度）";
		input.value = Number(degrees.toFixed(5));
		updateShooterAngleDial(input, dial);
	};

	let dragging = false;
	dial.addEventListener("pointerdown", e => {
		e.preventDefault();
		dragging = true;
		dial.setPointerCapture(e.pointerId);
		setFromPointer(e);
	});
	dial.addEventListener("pointermove", e => {
		if (dragging) setFromPointer(e);
	});
	let finishDrag = e => {
		if (!dragging) return;
		dragging = false;
		setFromPointer(e);
		commitShooterEdits(context.index, context.foc, context.pow, context.editor, input, false);
	};
	dial.addEventListener("pointerup", finishDrag);
	dial.addEventListener("pointercancel", finishDrag);
	dial.addEventListener("keydown", e => {
		if (e.key != "ArrowUp" && e.key != "ArrowRight" && e.key != "ArrowDown" && e.key != "ArrowLeft") return;
		e.preventDefault();
		let step = e.shiftKey ? 10 : 1;
		let direction = e.key == "ArrowUp" || e.key == "ArrowRight" ? 1 : -1;
		let degrees = input.dataset.angleMode == "radians" ? Number(input.value) * 180 / Math.PI : Number(input.value);
		input.dataset.angleMode = "degrees";
		nameForShooterInput(input).textContent = context.stat + "（度）";
		input.value = Number((degrees + direction * step).toFixed(5));
		updateShooterAngleDial(input, dial);
		commitShooterEdits(context.index, context.foc, context.pow, context.editor, input, false);
	});
	updateShooterAngleDial(input, dial);
	return dial;
};

function nameForShooterInput(input) {
	return input.parentElement.previousElementSibling;
};

function updateShooterAngleDial(input, dial) {
	if (!dial) return;
	let value = Number(input.value);
	if (!Number.isFinite(value)) return;
	let degrees = input.dataset.angleMode == "radians" ? value * 180 / Math.PI : value;
	let radians = degrees * Math.PI / 180;
	let pointer = dial.querySelector(".shooter-angle-pointer");
	pointer.setAttribute("x2", (50 + Math.cos(radians) * 34).toFixed(3));
	pointer.setAttribute("y2", (50 + Math.sin(radians) * 34).toFixed(3));
	dial.setAttribute("aria-valuenow", degrees.toFixed(2));
};

function convertShooterAngleInput(input, context) {
	if (input.dataset.angleMode == "radians") return;
	if (input.value.trim() == "") return error("角度数值不能为空");
	let degrees = Number(input.value);
	if (!Number.isFinite(degrees)) return error("请输入有效的角度数值");
	let radians = degrees * Math.PI / 180;
	input.value = radians;
	input.dataset.angleMode = "radians";
	input.dataset.originalValue = input.value;
	input.parentElement.previousElementSibling.textContent = context.stat + "（弧度）";
	shtObject.sht_arr[context.foc][context.pow][context.index][context.stat] = radians;
	updateShooterAngleDial(input, input.parentElement.querySelector(".shooter-angle-dial"));
};

function confirmShooterEdits(index, foc, pow, editor) {
	commitShooterEdits(index, foc, pow, editor, null, true);
};

function commitShooterEdits(index, foc, pow, editor, onlyInput, refreshBinding) {
	let inputs = Array.from(editor.querySelectorAll(".shooter-inspector input"));
	let updates = [];
	let bindingChanged = false;
	for (let input of inputs) {
		if (onlyInput && input != onlyInput) continue;
		if (input.value == input.dataset.originalValue) continue;
		if (input.value.trim() == "") {
			error("属性数值不能为空");
			return null;
		}
		let value = Number(input.value);
		if (!Number.isFinite(value)) {
			error("请输入有效的数值");
			return null;
		}
		let stat = input.dataset.stat;
		let property = stat.split("-").slice(1).join("-");
		if (isShooterAngle(property) && input.dataset.angleMode != "radians") value = value * Math.PI / 180;
		if (isShooterBindStat(stat)) bindingChanged = true;
		updates.push({input: input, value: value});
	}

	for (let update of updates) {
		update.input.value = update.value;
		tableInput(update.input, update.value, update.input.dataset.valueType, update.input.dataset.stat);
		if (isShooterAngle(update.input.dataset.stat.split("-").slice(1).join("-"))) {
			update.input.dataset.angleMode = "radians";
			update.input.parentElement.previousElementSibling.textContent =
				update.input.dataset.stat.split("-").slice(1).join("-") + "（弧度）";
		}
		update.input.dataset.originalValue = update.input.value;
	}
	if (bindingChanged && refreshBinding !== false) refreshShooterSet(index, foc, pow);
	return bindingChanged;
};

function refreshShooterSet(selectedIndex, foc, pow, nextSelectedIndices) {
	let previousEditor = tables.active && tables.active.querySelector(".shooter-editor");
	let selectedIndices = previousEditor ? selectedShooterIndices(previousEditor) : [];
	generateShootArrayTable(shtObject, currentStruct);
	reloadCurrentEditor();
	if (!tables.active) return;
	let editor = tables.active.querySelector(".shooter-editor");
	if (editor) {
		let validIndices = nextSelectedIndices || selectedIndices.filter(index => index < shtObject.sht_arr[foc][pow].length);
		setShooterSelection(editor, validIndices);
	}
	if (selectedIndex != null && editor && shtObject.sht_arr[foc][pow][selectedIndex]) {
		selectShooter(selectedIndex, foc, pow, editor);
	}
};

function addShooter(sht) {
	let shooter = generateEmptyShooterFromStruct(currentStruct);
	let [table, foc, pow] = activeTable;
	let arr = shtObject.sht_arr[foc][pow];
	arr.push(shooter);
	refreshShooterSet(arr.length - 1, foc, pow);
};

function removeShooter(i) {
	let [table, foc, pow] = activeTable;
	let arr = shtObject.sht_arr[foc][pow];
	arr.splice(i, 1);
	refreshShooterSet(null, foc, pow);
};

function generateEmptyShooterFromStruct(struct) {
	let shtStruct = struct.sht_arr;
	let flen = struct.flags_len;
	let shooter = {};
	for (let i=0; i<shtStruct.length; i+=2) {
		let prop = shtStruct[i], type = shtStruct[i+1];
		if (type != "flags") shooter[prop] = 0;
		else {
			shooter[prop] = new Array(flen);
			for (let i=0; i<flen; i++) {
				shooter[prop][i] = 0;
			};
		};
	};
	return shooter;
};

function addShooterset(foc) {
	let arr = shtObject.sht_arr[foc];
	arr.push(defaultShooterset(currentStruct.ver));
	generateShootArrayTable(shtObject, currentStruct);
	generateFileTree(true);
};

function removeShooterset(foc, i) {
	let arr = shtObject.sht_arr[foc];
	arr.splice(i, 1);
	if (activeTable[0] == "sht_arr" && activeTable[1] == foc && activeTable[2] == i) {
		$container.innerHTML = "";
		$active = null;
		tables.active = null;
	};
	generateShootArrayTable(shtObject, currentStruct);
	generateFileTree(true);
};

function updateClipboardInfo(txt) {
	$clipboard.innerText = txt;
};

function selectedShooterIndices(editor) {
	try {
		let indices = JSON.parse(editor.dataset.selectedShooters || "[]");
		return Array.isArray(indices) ? indices.filter(Number.isInteger) : [];
	} catch(e) {
		return [];
	}
};

function setShooterSelection(editor, indices) {
	let available = new Set(Array.from(editor.querySelectorAll(".shooter-select"))
		.filter($button => !$button.disabled)
		.map($button => Number($button.dataset.shooterIndex)));
	let selected = Array.from(new Set(indices))
		.filter(index => Number.isInteger(index) && available.has(index));
	editor.dataset.selectedShooters = JSON.stringify(selected);
	editor.querySelectorAll(".shooter-select").forEach($button => {
		$button.classList.toggle("selected", selected.includes(Number($button.dataset.shooterIndex)));
	});
};

function updateShooterSelection(index, event, editor) {
	let selected = selectedShooterIndices(editor);
	let anchor = Number(editor.dataset.selectionAnchor);
	if (event.shiftKey) {
		if (!Number.isInteger(anchor)) anchor = index;
		let start = Math.min(anchor, index);
		let end = Math.max(anchor, index);
		let range = [];
		for (let i=start; i<=end; i++) range.push(i);
		selected = event.ctrlKey || event.metaKey ? Array.from(new Set(selected.concat(range))) : range;
	} else if (event.ctrlKey || event.metaKey) {
		selected = selected.includes(index) ? selected.filter(item => item != index) : selected.concat(index);
		anchor = index;
	} else {
		selected = [index];
		anchor = index;
	}
	editor.dataset.selectionAnchor = anchor;
	setShooterSelection(editor, selected);
};

function handleShooterClipboardShortcuts(event) {
	if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
	let target = event.target;
	if (target && target.closest && target.closest("input, textarea, select, [contenteditable='true']")) return;
	if (activeTable[0] != "sht_arr") return;
	let key = event.key.toLowerCase();
	if (key == "c") {
		let editor = tables.active && tables.active.querySelector(".shooter-editor");
		if (!editor) return;
		let selected = selectedShooterIndices(editor);
		if (!selected.length) return;
		event.preventDefault();
		copyShooter(selected[0]);
	} else if (key == "v" && clipboard.length) {
		event.preventDefault();
		pasteShooter();
	}
};

function changeShooterBinding(indices, bindNumber, foc, pow, editor) {
	if (editor.dataset.selectedShooter != null) {
		let commitResult = commitShooterEdits(Number(editor.dataset.selectedShooter), foc, pow, editor, null, false);
		if (commitResult == null) return;
	}
	let arr = shtObject.sht_arr[foc][pow];
	let shooters = indices.map(index => arr[index]);
	if (!shooters.length || shooters.some(shooter => !shooter || !getShooterBindProperty(shooter))) {
		error("所选发射器无法更改子机绑定");
		return;
	}
	for (let shooter of shooters) shooter[getShooterBindProperty(shooter)] = bindNumber;
	refreshShooterSet(indices[0], foc, pow, indices);
};

function cloneObject(obj) {
	let ret = Array.isArray(obj) ? [] : {};
	for (let key in obj) ret[key] = typeof obj[key] == "object" ? cloneObject(obj[key]) : obj[key];
	return ret;
};

function copyShooter(i) {
	let [table, foc, pow] = activeTable;
	let foccn;
	if (foc === "focused") {
		foccn = "低速";
	} else if (foc === "unfocused") {
		foccn = "高速";
	} else if (foc === "extra") {
		foccn = "额外";
	} else if (foc === "main") {
		foccn = "主要";
	} else {
		foccn = "没有这玩意吧";
		error("未知的 foc 值: " + foc);
	}

	let arr = shtObject.sht_arr[foc][pow];
	let editor = tables.active && tables.active.querySelector(".shooter-editor");
	let indices = editor ? selectedShooterIndices(editor) : [];
	if (!indices.includes(i)) indices = [i];
	indices.sort((a, b) => a - b);
	clipboard = indices.map(index => arr[index]).filter(Boolean).map(cloneObject);
	updateClipboardInfo(clipboard.length + " 发射器 来自 "+foccn+"_"+pow);
};

function pasteShooter() {
	if (!activeTable || activeTable[0] != "sht_arr") return;
	let [table, foc, pow] = activeTable;
	let arr = shtObject.sht_arr[foc][pow];
	if (!clipboard.length) return;
	let firstAdded = arr.length;
	let selectedIndices = [];
	for (let i=0; i<clipboard.length; i++) {
		let sht = cloneObject(clipboard[i]);
		arr.push(sht);
		selectedIndices.push(firstAdded + i);
	};
	refreshShooterSet(firstAdded, foc, pow, selectedIndices);
};

function copyShooterset(foc, pow) {
	let arr = shtObject.sht_arr[foc][pow];
	let foccn;
	if (foc === "focused") {
		foccn = "低速";
	} else if (foc === "unfocused") {
		foccn = "高速";
	} else if (foc === "extra") {
		foccn = "额外";
	} else if (foc === "main") {
		foccn = "主要";
	} else {
		foccn = "没有这玩意吧";
		error("未知的 foc 值: " + foc);
	}
	clipboard = cloneObject(arr);
	updateClipboardInfo(arr.length + " 发射器 来自 "+foccn+"_"+pow);
};

function defaultShooterset(ver) {
	const ret = [];
	if (ver < 10)
		ret.power = 999;

	return ret;
}
