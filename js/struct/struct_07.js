window.struct_07 = {
	ver: 7,
	editorVer: "07",
	main: [
		"unknown_head", "int16",
		"sht_off_cnt", "int16",
		"bomb_per_life", "float", // why is this a float? only ZUN knows
		"deathbomb_wnd", "int32",
		"hitbox", "float",
		"grazebox", "float",
		"item_magnet_spd", "float",
		"itembox", "float",
		"death_cherry_loss", "float",
		"poc_line", "float", // distance of PoC from the top of the screen
		"move_nf_str", "float",
		"move_f_str", "float",
		"move_nf_dia", "float",
		"move_f_dia", "float",
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
