library(sf)
library(tidyverse)

centerlines <- st_read("C:/Users/Christian/Desktop/code/enma754/gitPull/roads/VirginiaRoadCenterline.shp", quiet=TRUE)

cat("=== ROAD CLASSIFICATION COLUMNS ===\n\n")
cat("Columns available:\n")
print(names(centerlines))

cat("\n\n=== MTFCC Classification (Major/Minor) ===\n")
print(table(centerlines$MTFCC))

cat("\n\n=== VDOT Functional Class ===\n")
print(table(centerlines$VDOT_FC))

cat("\n\n=== Road Type (SEG_TYPE) ===\n")
print(table(centerlines$SEG_TYPE))

cat("\n\n=== Sample major roads ===\n")
major <- centerlines %>% 
  filter(VDOT_FC %in% c("1", "2", "3")) %>%
  head()
print(major)
