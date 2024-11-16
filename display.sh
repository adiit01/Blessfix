#!/bin/bash

print_colored() {
    local color_code=$1
    local text=$2
    echo -e "\033[${color_code}m${text}\033[0m"
}

display_colored_text() {
    print_colored "40;96" "============================================================"  
    print_colored "42;37" "=======================  J.W.P.A  ==========================" 
    print_colored "45;97" "================= @cukong378 =====================" 
    print_colored "43;30" "=============== https://x.com/cukongtimur =================" 
    print_colored "41;97" "============= we support you ==============" 
    print_colored "44;30" "============================================================" 
}

display_colored_text
sleep 5

log() {
    local level=$1
    local message=$2
    echo "[$level] $message"
}
