window.struct_07 = {
	ver: 7,
	editorVer: "07",
	main: [
		"unknown_head", "int16",
		"sht_off_cnt", "int16",
		"BOMB数量", "float", // why is this a float? only ZUN knows
		"决死时间", "int32",
		"判定点大小", "float",
		"擦弹范围", "float",
		"道具吸取速度", "float",
		"道具吸取范围", "float",
		"死亡樱点减少率", "float",
		"收点线位置", "float", // distance of PoC from the top of the screen
		"高速直向移速", "float",
		"低速直向移速", "float",
		"高速斜向移速", "float",
		"低速斜向移速", "float",
		"sht_off", "sht_off",
		"sht_arr", "sht_arr"
	],
	sht_off: [
		"offset", "uint32",
		"power", "uint32"
	],
	sht_arr: [
		"发射间隔", "byte",
		"发射延迟", "byte",
		"伤害", "int16",
		"偏移x", "float",
		"偏移y", "float",
		"判定a", "float",
		"判定b", "float",
		"角度", "float",
		"绑定子机", "byte",
		"unknown_old_sht_1", "byte",
		"纹理ID", "int16",
		"音效ID", "int16",
		"初始效果", "int32",
		"每帧效果", "int32",
		"渲染效果", "int32",
		"击中效果", "int32",
	],
	sht_off_type: "abs",
	option_pos_len: false, // they don't exist here
	max_opt: false, // ^
	flags_len: 0x0,
	flag_size: 2,
	type: "maingame",
	forced_shtoffarr_len: false,
	f_uf_shooter_split: false
};
