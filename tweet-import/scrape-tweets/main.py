import datetime

from twitter.search import Search

import json

import os

import urllib.parse


DAYS_TO_SEARCH = 30


# Function to convert date string to datetime object
def parse_date(date_str):
    return datetime.datetime.strptime(date_str, "%a %b %d %H:%M:%S +0000 %Y")


# Function to simplify tweets
def simplify_tweet(tweet):
    try:
        urls = tweet["content"]["itemContent"]["tweet_results"]["result"]["legacy"][
            "entities"
        ]["urls"]
    except KeyError:
        return None

    expanded_urls = [
        url["expanded_url"]
        for url in urls
        if "expanded_url" in url
        and (
            "https://open.spotify.com/episode" in url["expanded_url"]
            or (
                "podcasts.apple.com" in url["expanded_url"]
                and "i=" in url["expanded_url"]
            )
        )
    ]

    if not expanded_urls:
        return None

    created_at = tweet["content"]["itemContent"]["tweet_results"]["result"]["legacy"][
        "created_at"
    ]

    screen_name = tweet["content"]["itemContent"]["tweet_results"]["result"]["core"][
        "user_results"
    ]["result"]["legacy"]["screen_name"]
    favorite_count = tweet["content"]["itemContent"]["tweet_results"]["result"][
        "legacy"
    ]["favorite_count"]
    tweet_id = tweet["content"]["itemContent"]["tweet_results"]["result"]["legacy"][
        "id_str"
    ]
    tweet_text = tweet["content"]["itemContent"]["tweet_results"]["result"]["legacy"][
        "full_text"
    ]

    return {
        "expanded_urls": expanded_urls,
        "screen_name": screen_name,
        "favorite_count": favorite_count,
        "tweet_id": tweet_id,
        "tweet_text": tweet_text,
        "created_at": created_at,
    }


# Main function
def main():
    search = Search(
        cookies={
            "ct0": "INSERT YOUR COOKIE HERE",
            "auth_token": "INSERT YOUR COOKIE HERE",
        },
        save=True,
        debug=1,
    )

    since_date = (
        datetime.datetime.now() - datetime.timedelta(days=DAYS_TO_SEARCH)
    ).strftime("%Y-%m-%d")
    res = search.run(
        limit=1000,
        retries=5,
        queries=[
            {
                "category": "Latest",
                "query": f"open.spotify.com/episode list:815723390048866304 min_faves:1 since:{since_date}",
            },
            {
                "category": "Latest",
                "query": f"podcasts.apple.com list:815723390048866304 min_faves:1 since:{since_date}",
            },
        ],
    )

    parsed_tweets = {}

    for query_res in res:
        for tweet in query_res:
            simplified_tweet = simplify_tweet(tweet)
            if not simplified_tweet or simplified_tweet["tweet_id"] in parsed_tweets:
                continue
            else:
                parsed_tweets[simplified_tweet["tweet_id"]] = simplified_tweet

    print(f"Found {len(parsed_tweets)} tweets out of {len(res)} queries")

    parsed_tweets = sorted(
        parsed_tweets.values(),
        key=lambda tweet: parse_date(tweet["created_at"]),
        reverse=True,  # Most recent tweets first
    )

    url_to_tweets = {}

    for tweet in parsed_tweets:
        for url in tweet["expanded_urls"]:
            parsed_url = urllib.parse.urlparse(url)
            query = urllib.parse.parse_qs(parsed_url.query)
            if "i" in query:
                url = f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}?i={query['i'][0]}"
            else:
                url = f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}"

            if url not in url_to_tweets:
                url_to_tweets[url] = {"mentioned_by": set(), "tweets": []}

            screen_name = tweet["screen_name"]

            if screen_name not in url_to_tweets[url]["mentioned_by"]:
                url_to_tweets[url]["mentioned_by"].add(screen_name)
                url_to_tweets[url]["tweets"].append(tweet)

    for url in url_to_tweets:
        url_to_tweets[url]["mentioned_by"] = list(url_to_tweets[url]["mentioned_by"])

    sorted_url_to_tweets = {
        k: v
        for k, v in sorted(
            url_to_tweets.items(),
            key=lambda item: len(item[1]["mentioned_by"]),
            reverse=True,
        )
    }

    print(f"Found {len(sorted_url_to_tweets)} unique URLs")

    with open(os.path.join(os.path.dirname(__file__), "url_to_tweets.json"), "w") as f:
        json.dump(sorted_url_to_tweets, f, indent=4)


if __name__ == "__main__":
    main()
