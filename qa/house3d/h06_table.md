## h06 — house landmarks vs reference (house height 396 px, target <= 2 %)

| landmark | ref | render | err px | % | |
|---|---|---|---|---|---|
| finial_C_top | 1237, 621 | 1244, 605 | 17.1 | 4.3 | FAIL |
| gable_C_apex | 1237, 628 | 1244, 632 | 8.6 | 2.2 | FAIL |
| gable_C_foot_R | 1315, 723 | 1316, 736 | 12.8 | 3.2 | FAIL |
| finial_L_top | 1137, 626 | 1138, 625 | 2.2 | 0.5 | ok |
| gable_L_apex | 1137, 647 | 1139, 652 | 5.2 | 1.3 | ok |
| gable_L_window | 1137, 697 | 1154, 679 | 24.7 | 6.2 | FAIL |
| gable_C_window | 1237, 693 | 1244, 698 | 8.4 | 2.1 | FAIL |
| finial_end_L_top | 1087, 648 | 1122, 631 | 38.7 | 9.8 | FAIL |
| finial_end_R_top | 1417, 631 | 1379, 631 | 38.7 | 9.8 | FAIL |
| ridge_R_end | 1415, 657 | 1378, 659 | 36.6 | 9.3 | FAIL |
| eave_L | 1060, 727 | 1074, 729 | 14.1 | 3.6 | FAIL |
| eave_R | 1437, 728 | 1426, 729 | 10.7 | 2.7 | FAIL |
| attic_open_TL | 1297, 670 | 1291, 675 | 7.3 | 1.9 | ok |
| attic_open_BR | 1400, 715 | 1401, 728 | 13.4 | 3.4 | FAIL |
| post_1_F3 | 1081, 818 | 1090, 824 | 10.9 | 2.8 | FAIL |
| post_2_F3 | 1203, 818 | 1207, 824 | 6.6 | 1.7 | ok |
| post_3_F3 | 1307, 818 | 1301, 824 | 8.3 | 2.1 | FAIL |
| post_4_F3 | 1420, 818 | 1410, 824 | 11.3 | 2.9 | FAIL |
| post_1_F2 | 1081, 907 | 1091, 904 | 10.3 | 2.6 | FAIL |
| post_2_F2 | 1203, 907 | 1207, 904 | 4.5 | 1.1 | ok |
| post_3_F2 | 1307, 907 | 1301, 904 | 6.9 | 1.7 | ok |
| post_4_F2 | 1420, 907 | 1410, 904 | 10.8 | 2.7 | FAIL |
| ground_C | 1255, 1000 | 1254, 989 | 11.1 | 2.8 | FAIL |
| wingL_finial | 1058, 762 | 1064, 785 | 24.4 | 6.2 | FAIL |
| wingL_upper_eave | 1033, 820 | 1050, 824 | 17.0 | 4.3 | FAIL |
| wingL_lower_eave | 1023, 907 | 1037, 905 | 14.2 | 3.6 | FAIL |
| wingL_rail_top | 1032, 970 | 1048, 964 | 17.1 | 4.3 | FAIL |
| wingR_finial | 1445, 763 | 1435, 785 | 24.2 | 6.1 | FAIL |
| wingR_upper_eave | 1457, 822 | 1449, 824 | 8.5 | 2.2 | FAIL |
| wingR_lower_eave | 1475, 907 | 1461, 905 | 14.2 | 3.6 | FAIL |
| wingR_rail_top | 1463, 970 | 1451, 964 | 13.7 | 3.5 | FAIL |
| plinth_L | 1010, 1005 | 1041, 995 | 32.8 | 8.3 | FAIL |
| plinth_R | 1490, 1005 | 1457, 995 | 34.4 | 8.7 | FAIL |
| plinth_bottom_C | 1257, 1017 | 1256, 1001 | 15.3 | 3.9 | FAIL |

**6/34 landmarks within 2 %**, mean 3.97 % · silhouette IoU **0.866** (target 0.92)
