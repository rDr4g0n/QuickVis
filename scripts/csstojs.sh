#! /bin/bash

# takes a list of css files, concats em, and wraps
# them in js so they can be injected into the document
# at run time

OUT_FILE=$1
shift

if [ $# -eq 0 ]; then
    echo "ERROR: no css files were provided"
    exit 1
fi
CSS_FILES=$@

echo "combining $# css files"

CSS=""
for f in $CSS_FILES; do
    sed -i '1s/^\xEF\xBB\xBF//' $f
    CSS+="$(cat $f)"
done

cat > $OUT_FILE << EOM
(function(){
    var styleEl = document.createElement("style");
    styleEl.type = "text/css";
    styleEl.appendChild(document.createTextNode('$CSS'));
    document.head.appendChild(styleEl);
})();
EOM
