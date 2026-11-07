## h25 — house landmarks vs reference (house height 396 px, target <= 2 %)

| landmark | ref | render | err px | % | |
|---|---|---|---|---|---|
| finial_C_top | 1237, 621 | 1237, 617 | 3.4 | 0.9 | ok |
| gable_C_apex | 1237, 628 | 1237, 626 | 2.5 | 0.6 | ok |
| gable_C_foot_R | 1315, 723 | 1314, 724 | 2.0 | 0.5 | ok |
| finial_L_top | 1137, 626 | 1134, 626 | 3.0 | 0.8 | ok |
| gable_L_apex | 1137, 647 | 1134, 647 | 2.9 | 0.7 | ok |
| gable_L_window | 1137, 697 | 1134, 696 | 2.6 | 0.7 | ok |
| gable_C_window | 1237, 693 | 1237, 688 | 5.3 | 1.3 | ok |
| finial_end_L_top | 1087, 648 | 1091, 644 | 6.1 | 1.5 | ok |
| finial_end_R_top | 1417, 631 | 1414, 626 | 5.4 | 1.4 | ok |
| ridge_R_end | 1415, 657 | 1414, 652 | 4.8 | 1.2 | ok |
| eave_L | 1060, 727 | 1056, 721 | 6.8 | 1.7 | ok |
| eave_R | 1437, 728 | 1442, 721 | 8.0 | 2.0 | FAIL |
| attic_open_TL | 1297, 670 | 1295, 664 | 6.4 | 1.6 | ok |
| attic_open_BR | 1400, 715 | 1403, 715 | 3.1 | 0.8 | ok |
| post_1_F3 | 1081, 818 | 1080, 823 | 5.2 | 1.3 | ok |
| post_2_F3 | 1203, 818 | 1204, 823 | 5.2 | 1.3 | ok |
| post_3_F3 | 1307, 818 | 1306, 823 | 5.2 | 1.3 | ok |
| post_4_F3 | 1420, 818 | 1423, 823 | 5.7 | 1.4 | ok |
| post_1_F2 | 1081, 907 | 1080, 909 | 2.1 | 0.5 | ok |
| post_2_F2 | 1203, 907 | 1205, 909 | 2.5 | 0.6 | ok |
| post_3_F2 | 1307, 907 | 1306, 909 | 2.6 | 0.7 | ok |
| post_4_F2 | 1420, 907 | 1422, 909 | 2.8 | 0.7 | ok |
| ground_C | 1255, 1000 | 1255, 1000 | 0.1 | 0.0 | ok |
| wingL_finial | 1058, 762 | 1054, 762 | 3.8 | 1.0 | ok |
| wingL_upper_eave | 1033, 820 | 1029, 824 | 5.3 | 1.3 | ok |
| wingL_lower_eave | 1023, 907 | 1019, 910 | 5.5 | 1.4 | ok |
| wingL_rail_top | 1032, 970 | 1030, 973 | 3.4 | 0.9 | ok |
| wingR_finial | 1445, 763 | 1449, 762 | 4.5 | 1.1 | ok |
| wingR_upper_eave | 1457, 822 | 1461, 824 | 4.5 | 1.1 | ok |
| wingR_lower_eave | 1475, 907 | 1479, 910 | 5.5 | 1.4 | ok |
| wingR_rail_top | 1463, 970 | 1469, 973 | 6.6 | 1.7 | ok |
| plinth_L | 1010, 1005 | 1003, 1005 | 6.9 | 1.8 | ok |
| plinth_R | 1490, 1005 | 1497, 1005 | 7.3 | 1.8 | ok |
| plinth_bottom_C | 1257, 1017 | 1257, 1013 | 3.4 | 0.9 | ok |

**33/34 landmarks within 2 %**, mean 1.12 % · silhouette IoU **0.931** (target 0.92)
stats: {'calls': 101, 'triangles_drawn': 525912, 'meshes': 35, 'scene_tris': 176640} · frame 2.2 ms (SwiftShader, not device speed)
