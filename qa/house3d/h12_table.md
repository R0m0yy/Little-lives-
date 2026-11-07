## h12 — house landmarks vs reference (house height 396 px, target <= 2 %)

| landmark | ref | render | err px | % | |
|---|---|---|---|---|---|
| finial_C_top | 1237, 621 | 1244, 616 | 8.4 | 2.1 | FAIL |
| gable_C_apex | 1237, 628 | 1244, 620 | 11.0 | 2.8 | FAIL |
| gable_C_foot_R | 1315, 723 | 1320, 726 | 5.6 | 1.4 | ok |
| finial_L_top | 1137, 626 | 1133, 624 | 4.1 | 1.0 | ok |
| gable_L_apex | 1137, 647 | 1133, 640 | 7.1 | 1.8 | ok |
| gable_L_window | 1137, 697 | 1134, 698 | 3.0 | 0.8 | ok |
| gable_C_window | 1237, 693 | 1244, 690 | 7.5 | 1.9 | ok |
| finial_end_L_top | 1087, 648 | 1091, 646 | 5.0 | 1.3 | ok |
| finial_end_R_top | 1417, 631 | 1412, 628 | 6.1 | 1.5 | ok |
| ridge_R_end | 1415, 657 | 1411, 654 | 4.5 | 1.1 | ok |
| eave_L | 1060, 727 | 1056, 723 | 5.5 | 1.4 | ok |
| eave_R | 1437, 728 | 1439, 723 | 5.4 | 1.4 | ok |
| attic_open_TL | 1297, 670 | 1293, 666 | 5.4 | 1.4 | ok |
| attic_open_BR | 1400, 715 | 1411, 716 | 10.6 | 2.7 | FAIL |
| post_1_F3 | 1081, 818 | 1080, 824 | 5.6 | 1.4 | ok |
| post_2_F3 | 1203, 818 | 1204, 824 | 5.6 | 1.4 | ok |
| post_3_F3 | 1307, 818 | 1304, 824 | 6.4 | 1.6 | ok |
| post_4_F3 | 1420, 818 | 1420, 824 | 5.6 | 1.4 | ok |
| post_1_F2 | 1081, 907 | 1081, 909 | 1.9 | 0.5 | ok |
| post_2_F2 | 1203, 907 | 1204, 909 | 1.9 | 0.5 | ok |
| post_3_F2 | 1307, 907 | 1304, 909 | 3.8 | 1.0 | ok |
| post_4_F2 | 1420, 907 | 1419, 909 | 2.0 | 0.5 | ok |
| ground_C | 1255, 1000 | 1254, 999 | 1.5 | 0.4 | ok |
| wingL_finial | 1058, 762 | 1055, 763 | 3.6 | 0.9 | ok |
| wingL_upper_eave | 1033, 820 | 1030, 824 | 5.2 | 1.3 | ok |
| wingL_lower_eave | 1023, 907 | 1020, 910 | 4.8 | 1.2 | ok |
| wingL_rail_top | 1032, 970 | 1031, 972 | 2.5 | 0.6 | ok |
| wingR_finial | 1445, 763 | 1446, 763 | 1.3 | 0.3 | ok |
| wingR_upper_eave | 1457, 822 | 1458, 824 | 2.6 | 0.6 | ok |
| wingR_lower_eave | 1475, 907 | 1476, 910 | 3.4 | 0.9 | ok |
| wingR_rail_top | 1463, 970 | 1466, 972 | 3.6 | 0.9 | ok |
| plinth_L | 1010, 1005 | 1004, 1004 | 6.1 | 1.5 | ok |
| plinth_R | 1490, 1005 | 1494, 1004 | 3.9 | 1.0 | ok |
| plinth_bottom_C | 1257, 1017 | 1256, 1012 | 4.6 | 1.2 | ok |

**31/34 landmarks within 2 %**, mean 1.23 % · silhouette IoU **0.926** (target 0.92)
