# ---------------------------------------------------------------------------
# Purpose:   Banner word cloud of concepts across Rafael Carranza's papers
# Input:     cloud.csv (term, freq, df, cat) - counts from the full text
#            of the published PDFs, each concept tagged by kind
# Output:    cloud.svg        vector banner for the top of the about page
#            cloud_check.png  raster copy for eyeballing the layout
# Structure: 1. Parameters  2. Read and scale  3. Draw  4. Write  5. Guard
#
# Size encodes frequency; colour encodes the kind of concept (topic, method,
# data source, place), which is why the banner palette differs from the page.
#
# Note: ggwordcloud only warns when labels do not fit - it leaves them
# overlapping at their original positions. Section 5 turns that into an error.
# ---------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(ggplot2)
  library(ggwordcloud)
  library(svglite)
})

setwd(Sys.getenv("CLOUD_DIR"))

# **** 1. Parameters ********************************************************

W       <- 22          # canvas width, inches
H       <- 4.4         # canvas height, inches  (5:1 banner)
SIZE_MM <- c(6.1, 13)  # smallest and largest label
MARGIN  <- 1           # padding between labels, grid units
SEED    <- 20260911

# Hue says what kind of concept it is; depth within the hue says how often it
# appears. Three steps per hue keeps the SVG to twelve colours, so the page can
# still re-map them for dark mode.
HUES <- list(
  topic  = c("#7FB3AF", "#3E8C87", "#12514D"),  # teal,  light -> dark
  method = c("#D8B277", "#B0762A", "#7A4E12"),  # ochre
  data   = c("#93A8C8", "#4E6C9B", "#2A4166"),  # slate blue
  place  = c("#CF8B86", "#A8413C", "#761515")   # brick
)
DEPTHS <- c("lo", "mid", "hi")

# **** 2. Read and scale ****************************************************

d   <- read.csv("cloud.csv", stringsAsFactors = FALSE)
d   <- d[order(-d$freq), ]
lg  <- log10(d$freq)
rel <- (lg - min(lg)) / (max(lg) - min(lg))
d$mm <- SIZE_MM[1] + rel * diff(SIZE_MM)

# depth follows the same log-frequency scale as the size
d$depth <- cut(rel, breaks = c(-Inf, 1/3, 2/3, Inf), labels = DEPTHS)
d$key   <- paste(d$cat, d$depth, sep = "_")

PAL <- unlist(lapply(names(HUES),
  function(k) setNames(HUES[[k]], paste(k, DEPTHS, sep = "_"))))

# **** 3. Draw **************************************************************

p <- ggplot(d, aes(label = term, size = mm, colour = key)) +
  geom_text_wordcloud(
    family       = "sans",
    fontface     = "bold",
    eccentricity = W / H,
    rm_outside   = FALSE,
    grid_margin  = MARGIN,
    seed         = SEED
  ) +
  scale_size_identity() +
  scale_colour_manual(values = PAL) +
  theme_void() +
  theme(plot.margin      = margin(0, 0, 0, 0),
        plot.background  = element_blank(),
        panel.background = element_blank())

# **** 4. Write *************************************************************

overflow <- FALSE
draw <- function(open_dev) {
  withCallingHandlers({
    open_dev(); print(p); invisible(dev.off())
  }, warning = function(w) {
    if (grepl("could not fit", conditionMessage(w))) overflow <<- TRUE
    invokeRestart("muffleWarning")
  })
}

draw(function() svglite("cloud.svg", width = W, height = H, bg = "transparent"))
draw(function() png("cloud_check.png", width = W, height = H,
                    units = "in", res = 96, bg = "white"))

# **** 5. Guard *************************************************************

cat("terms:", nrow(d), "| canvas:", W, "x", H, "in",
    "| size (mm):", round(min(d$mm), 1), "-", round(max(d$mm), 1),
    "| overflow:", overflow, "\n")
print(table(d$cat, d$depth))

if (overflow) {
  stop("ggwordcloud could not place every label - widen the canvas, ",
       "lower SIZE_MM[2], or reduce MARGIN")
}
