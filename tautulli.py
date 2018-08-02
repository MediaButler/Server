import requests
import json
import argparse

parser = argparse.ArgumentParser()

parser.add_argument('-k', '--key', action='store', default='', help='Stream key')
parser.add_argument('-rk', '--rating-key', action='store', default='', help='Rating key')
parser.add_argument('-a', '--action', action='store', help='action to send')
parser.add_argument('-u', '--url', action='store', help='url')
args = parser.parse_args()
headers = {"Content-Type": "application/json","Accept": "application/json",}
payload = {"session_key": args.key,"rating_key": args.rating_key,"action": args.action}
r = requests.post(args.url, data=json.dumps(payload), headers=headers)
