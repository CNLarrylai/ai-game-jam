#!/bin/bash
cd "$(dirname "$0")"
pip3 install gradio anthropic -q
python3 demo.py
